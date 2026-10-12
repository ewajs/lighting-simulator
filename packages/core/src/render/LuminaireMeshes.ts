import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import type { Catalog, Luminaire, Photometry, Product, Room, Scene } from '../types';
import { candelaGrid } from '../photometry/grid';
import { buildFixture, type Fixture } from './fixtures';
import { IesLight, profileTexture } from './IesLight';
import { candela, kelvinToRgb, lightingProduct } from './lighting';
import { overlayColor } from './overlay';
import type { RenderMode } from './RoomMeshes';

/** Only the brightest few lights cast shadows; the rest still light the scene. */
export const SHADOW_BUDGET = 8;
/** Emissive strength of lit faces, chosen so they read bright under BASE_EXPOSURE. */
const EMISSIVE_GAIN = 160;
const HIGHLIGHT_COLOR = 0xf5b544;
/** Gap between a highlighted fixture and its outline, in m. */
const HIGHLIGHT_MARGIN = 0.04;
const DEG = Math.PI / 180;

/** An IES distribution ready for the GPU, shared by every luminaire of a product. */
interface Profile {
  readonly texture: THREE.DataTexture;
  /** Peak intensity in cd; the texture holds values relative to it. */
  readonly peak: number;
}

interface Item {
  readonly productId: string;
  /** The photometry the fixture was built with; a new arrival rebuilds it. */
  readonly photometry: Photometry | undefined;
  /** The model template it was built from; one that arrives later rebuilds it. */
  readonly model: THREE.Object3D | undefined;
  /** The product as lit, with flux and beam from its photometry if any. */
  readonly product: Product;
  readonly fixture: Fixture;
  /** Luminous flux currently emitted, in lm (0 when off). */
  flux: number;
  outline?: THREE.Box3Helper;
}

/** Keeps one fixture (mesh + light) per luminaire in sync with the scene. */
export class LuminaireMeshes {
  readonly group = new THREE.Group();
  readonly #items = new Map<string, Item>();
  readonly #profiles = new Map<Photometry, Profile>();
  readonly #catalog: Catalog;
  readonly #photometry: (productId: string) => Photometry | undefined;
  readonly #model: (productId: string) => THREE.Object3D | undefined;

  /** `photometry` and `model` look up what a product has loaded so far. */
  constructor(
    catalog: Catalog,
    photometry: (productId: string) => Photometry | undefined,
    model: (productId: string) => THREE.Object3D | undefined,
  ) {
    this.#catalog = catalog;
    this.#photometry = photometry;
    this.#model = model;
  }

  sync(scene: Scene, highlighted: readonly string[], mode: RenderMode): void {
    const present = new Set<string>();
    for (const luminaire of scene.luminaires) {
      const item = this.#itemFor(luminaire);
      if (!item) continue;
      present.add(luminaire.id);
      this.#update(item, luminaire, scene.room, mode);
      this.#outline(item, highlighted.includes(luminaire.id));
    }
    for (const id of this.#items.keys()) if (!present.has(id)) this.#remove(id);
    this.#assignShadows();
  }

  /** Total flux currently emitted, in lm. */
  totalFlux(): number {
    let flux = 0;
    for (const item of this.#items.values()) flux += item.flux;
    return flux;
  }

  /** Finds the luminaire id an intersected object belongs to. */
  luminaireIdOf(object: THREE.Object3D): string | undefined {
    for (const [id, item] of this.#items) {
      let current: THREE.Object3D | null = object;
      while (current && current !== item.fixture.root) current = current.parent;
      if (current) return id;
    }
    return undefined;
  }

  /**
   * The luminaire whose body comes nearest a screen point, within `slopPx`:
   * the distance to its bounding rectangle on screen, pendant cords left out.
   * For thin fixtures, such as a linear pendant, and for fingers.
   */
  nearestOnScreen(
    camera: THREE.Camera,
    pointerPx: THREE.Vector2,
    viewportPx: THREE.Vector2,
    slopPx: number,
  ): string | undefined {
    let nearest: { id: string; distance: number } | undefined;
    for (const [id, { fixture }] of this.#items) {
      const cords = new Set<THREE.Object3D>(fixture.cords.map((cord) => cord.mesh));
      const box = new THREE.Box3();
      for (const part of fixture.root.children)
        if (!cords.has(part)) box.expandByObject(part, true);
      const rect = screenRect(box, camera, viewportPx);
      if (!rect) continue;
      const dx = Math.max(rect.min.x - pointerPx.x, 0, pointerPx.x - rect.max.x);
      const dy = Math.max(rect.min.y - pointerPx.y, 0, pointerPx.y - rect.max.y);
      const distance = Math.hypot(dx, dy);
      if (distance <= slopPx && (!nearest || distance < nearest.distance)) {
        nearest = { id, distance };
      }
    }
    return nearest?.id;
  }

  /** Shows or hides all highlight outlines without changing which are highlighted. */
  setOutlinesVisible(visible: boolean): void {
    for (const item of this.#items.values()) if (item.outline) item.outline.visible = visible;
  }

  dispose(): void {
    for (const id of [...this.#items.keys()]) this.#remove(id);
    for (const profile of this.#profiles.values()) profile.texture.dispose();
    this.#profiles.clear();
  }

  #itemFor(luminaire: Luminaire): Item | undefined {
    const existing = this.#items.get(luminaire.id);
    const photometry = this.#photometry(luminaire.productId);
    const model = this.#model(luminaire.productId);
    const unchanged =
      existing?.productId === luminaire.productId &&
      existing.photometry === photometry &&
      existing.model === model;
    if (existing && unchanged) return existing;
    if (existing) this.#remove(luminaire.id);
    const catalogProduct = this.#catalog.get(luminaire.productId);
    if (!catalogProduct) return undefined; // Unknown products are skipped, not drawn.
    const product = lightingProduct(catalogProduct, photometry);
    const item: Item = {
      productId: product.id,
      photometry,
      model,
      product,
      fixture: buildFixture(product, photometry && this.#profile(photometry).texture, model),
      flux: 0,
    };
    this.group.add(item.fixture.root);
    this.#items.set(luminaire.id, item);
    return item;
  }

  #update(item: Item, luminaire: Luminaire, room: Room, mode: RenderMode): void {
    const { product } = item;
    const { root, light, lightOrigin, emissive, head, cords } = item.fixture;
    const { x, y, z } = luminaire.position;
    root.position.set(x, y, z);

    // Aim: tilt from straight down towards local +z, then pan around the vertical.
    // A head (track) turns on its own. Without one, pan turns the whole fixture,
    // its installed orientation, so a model's asymmetric parts follow its light
    // (ADR 0043); tilt is then the light's alone.
    const tilt = luminaire.aim.tiltDeg * DEG;
    const pan = luminaire.aim.panDeg * DEG;
    const wallYaw = product.mount === 'wall' ? yawAwayFromWall(luminaire, room) : 0;
    root.rotation.set(0, wallYaw + (head ? 0 : pan), 0);
    const lightPan = head ? pan : 0;
    if (head) head.rotation.set(-tilt, pan, 0, 'YXZ');
    // An IES light turns with the aim; its frame's −y is the aim, +z forward (ADR 0036).
    if (light instanceof IesLight) light.rotation.set(-tilt, lightPan, 0, 'YXZ');
    if (light instanceof THREE.SpotLight) {
      const direction = new THREE.Vector3(0, -1, 0).applyEuler(
        new THREE.Euler(-tilt, lightPan, 0, 'YXZ'),
      );
      light.target.position.copy(lightOrigin).add(direction);
    }
    for (const { mesh, anchor } of cords) {
      const length = Math.max(0.01, room.height - y - anchor.y);
      mesh.scale.y = length;
      mesh.position.set(anchor.x, anchor.y + length / 2, anchor.z);
    }

    const level = luminaire.on ? luminaire.dimming : 0;
    const { r, g, b } = kelvinToRgb(luminaire.cct);
    light.color.setRGB(r, g, b, THREE.SRGBColorSpace);
    const peak = item.photometry ? this.#profile(item.photometry).peak : candela(product);
    light.intensity = peak * level;
    item.flux = product.flux * level;
    for (const material of emissive) {
      material.emissive.copy(light.color);
      material.emissiveIntensity = mode === 'clay' ? 0 : level * EMISSIVE_GAIN;
    }
  }

  #profile(photometry: Photometry): Profile {
    let profile = this.#profiles.get(photometry);
    if (!profile) {
      const grid = candelaGrid(photometry);
      profile = { texture: profileTexture(grid), peak: grid.peak };
      this.#profiles.set(photometry, profile);
    }
    return profile;
  }

  #outline(item: Item, on: boolean): void {
    if (on && !item.outline) {
      item.outline = new THREE.Box3Helper(new THREE.Box3());
      (item.outline.material as THREE.Material).dispose();
      item.outline.material = outlineMaterial();
      item.outline.renderOrder = 1;
      this.group.add(item.outline);
    } else if (!on && item.outline) {
      this.#removeOutline(item);
    }
    if (item.outline) {
      item.fixture.root.updateMatrixWorld(true);
      item.outline.box.setFromObject(item.fixture.root, true).expandByScalar(HIGHLIGHT_MARGIN);
    }
  }

  #assignShadows(): void {
    const ranked = [...this.#items.values()].sort((a, b) => b.flux - a.flux);
    ranked.forEach((item, rank) => {
      const { light } = item.fixture;
      light.castShadow = rank < SHADOW_BUDGET && item.flux > 0;
      light.shadow.needsUpdate = true;
    });
  }

  #removeOutline(item: Item): void {
    if (!item.outline) return;
    this.group.remove(item.outline);
    item.outline.dispose();
    delete item.outline;
  }

  #remove(id: string): void {
    const item = this.#items.get(id);
    if (!item) return;
    this.#removeOutline(item);
    this.group.remove(item.fixture.root);
    item.fixture.dispose();
    this.#items.delete(id);
  }
}

/** Wall fixtures face away from the wall they sit on (their local +z points into the room). */
function yawAwayFromWall({ position }: Luminaire, room: Room): number {
  const distances: [number, number][] = [
    [position.z + room.depth / 2, 0],
    [room.depth / 2 - position.z, Math.PI],
    [position.x + room.width / 2, Math.PI / 2],
    [room.width / 2 - position.x, -Math.PI / 2],
  ];
  return distances.reduce((best, next) => (next[0] < best[0] ? next : best))[1];
}

/** The outline's line material: drawn through other objects, in a colour that reads as itself. */
function outlineMaterial(): THREE.LineBasicNodeMaterial {
  const material = new THREE.LineBasicNodeMaterial({ depthTest: false });
  material.colorNode = overlayColor(color(HIGHLIGHT_COLOR));
  return material;
}

/** A box's bounding rectangle on screen, in px; null if empty or partly behind the camera. */
function screenRect(
  box: THREE.Box3,
  camera: THREE.Camera,
  viewportPx: THREE.Vector2,
): THREE.Box2 | null {
  if (box.isEmpty()) return null;
  const rect = new THREE.Box2();
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const corner = new THREE.Vector3(x, y, z).project(camera);
        if (corner.z > 1) return null;
        rect.expandByPoint(
          new THREE.Vector2(
            ((corner.x + 1) / 2) * viewportPx.x,
            ((1 - corner.y) / 2) * viewportPx.y,
          ),
        );
      }
    }
  }
  return rect;
}

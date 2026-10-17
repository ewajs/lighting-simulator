import * as THREE from 'three/webgpu';
import { modelLayout, placeholderLayout, type FixtureLayout } from '../fixture-layout';
import type { Logger } from '../logger';
import { fixturePose } from '../luminaire-frame';
import type { Catalog, Luminaire, Photometry, Product, Room, Scene } from '../types';
import { candelaGrid } from '../photometry/grid';
import { buildFixture, type Fixture } from './fixtures';
import { IesLight, profileTexture } from './IesLight';
import { candela } from '../photometry/estimate';
import { kelvinToRgb, lightingProduct } from './lighting';
import { selectionOutline, tagItem } from './overlay';
import type { RenderMode } from './RoomMeshes';

/** Only the brightest few lights cast shadows; the rest still light the scene. */
export const SHADOW_BUDGET = 8;
/** Emissive strength of lit faces, chosen so they read bright under BASE_EXPOSURE. */
const EMISSIVE_GAIN = 160;
/** Gap between a highlighted fixture and its outline, in m. */
const HIGHLIGHT_MARGIN = 0.04;

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
  /** Where its light sits and what turns with the aim, shared with the calculation. */
  readonly layout: FixtureLayout;
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
  readonly #ready: (productId: string) => boolean;
  readonly #photometry: (productId: string) => Photometry | undefined;
  readonly #model: (productId: string) => THREE.Object3D | undefined;
  readonly #modelFile: (productId: string) => ArrayBuffer | undefined;
  readonly #logger: Logger;
  /** How many lights cast shadows, as last logged. */
  #shadowCasters = 0;

  /** `photometry`, `model` and `modelFile` look up what a product has loaded so far. */
  constructor({
    catalog,
    ready,
    photometry,
    model,
    modelFile,
    logger,
  }: {
    readonly catalog: Catalog;
    /** Whether a product's IES file and model are in (or known missing), so it can be drawn. */
    readonly ready: (productId: string) => boolean;
    readonly photometry: (productId: string) => Photometry | undefined;
    readonly model: (productId: string) => THREE.Object3D | undefined;
    /** The model's file, read for its layout the way the calculation reads it. */
    readonly modelFile: (productId: string) => ArrayBuffer | undefined;
    readonly logger: Logger;
  }) {
    this.#catalog = catalog;
    this.#ready = ready;
    this.#photometry = photometry;
    this.#model = model;
    this.#modelFile = modelFile;
    this.#logger = logger;
  }

  /** How many luminaires are drawn: those whose products are ready and known. */
  get count(): number {
    return this.#items.size;
  }

  /** How many lights cast shadows now, at most SHADOW_BUDGET. */
  get shadowCasters(): number {
    return this.#shadowCasters;
  }

  sync(scene: Scene, highlighted: readonly string[], mode: RenderMode): void {
    const present = new Set<string>();
    const show = (luminaire: Luminaire) => {
      const item = this.#itemFor(luminaire);
      if (!item) return;
      present.add(luminaire.id);
      this.#update(item, luminaire, scene.room, mode);
      this.#outline(item, highlighted.includes(luminaire.id));
    };
    scene.luminaires.forEach(show);
    for (const id of this.#items.keys()) if (!present.has(id)) this.#remove(id);
    // Rebuilt fixtures start without a shadow, which is what they lost.
    const losing = this.#assignShadows();
    for (const id of losing) {
      this.#remove(id);
      const luminaire = scene.luminaires.find((l) => l.id === id);
      if (luminaire) show(luminaire);
    }
    const casters = [...this.#items.values()].filter((item) => item.fixture.light.castShadow);
    if (casters.length !== this.#shadowCasters || losing.length > 0) {
      this.#shadowCasters = casters.length;
      const rebuilt = losing.length > 0 ? `; rebuilt ${losing.length} that lost theirs` : '';
      this.#logger.debug(
        `[render] Shadows from ${casters.length} of ${this.#items.size} lights (budget ${SHADOW_BUDGET})${rebuilt}`,
      );
    }
  }

  /** Total flux currently emitted, in lm. */
  totalFlux(): number {
    let flux = 0;
    for (const item of this.#items.values()) flux += item.flux;
    return flux;
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

  /**
   * The drawn fixture for a luminaire, built or rebuilt as needed. None while
   * its product's files are still loading, so a stand-in light or a
   * placeholder never shows, nor for a product the catalog lacks.
   */
  #itemFor(luminaire: Luminaire): Item | undefined {
    const existing = this.#items.get(luminaire.id);
    if (!existing && !this.#ready(luminaire.productId)) return undefined;
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
      layout: this.#layout(product, model),
      flux: 0,
    };
    tagItem(item.fixture.root, luminaire.id);
    this.group.add(item.fixture.root);
    this.#items.set(luminaire.id, item);
    return item;
  }

  /** The layout of a fixture drawn from `model`, or from the placeholder when there's none. */
  #layout(product: Product, model: THREE.Object3D | undefined): FixtureLayout {
    const file = model && this.#modelFile(product.id);
    if (!file) return placeholderLayout(product.mount);
    try {
      return modelLayout(file);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#logger.warn(
        `[models] "${product.id}" layout unreadable, using the placeholder's: ${reason}`,
      );
      return placeholderLayout(product.mount);
    }
  }

  #update(item: Item, luminaire: Luminaire, room: Room, mode: RenderMode): void {
    const { product } = item;
    const { root, light, emissive, head, cords } = item.fixture;
    const { x, y, z } = luminaire.position;
    root.position.set(x, y, z);

    // The turns come from fixturePose, which the calculation shares (ADR 0057).
    const pose = fixturePose(luminaire, product.mount, room, item.layout);
    root.rotation.set(0, pose.rootYawRad, 0);
    if (head && pose.head) head.rotation.set(-pose.head.tiltRad, pose.head.panRad, 0, 'YXZ');
    const { x: lx, y: ly, z: lz } = pose.lightPosition;
    light.position.set(lx, ly, lz);
    // An IES light turns with the aim; its frame's −y is the aim, +z forward (ADR 0036).
    const lightRotation = new THREE.Euler(-pose.tiltRad, pose.lightPanRad, 0, 'YXZ');
    if (light instanceof IesLight) light.rotation.copy(lightRotation);
    if (light instanceof THREE.SpotLight) {
      const direction = new THREE.Vector3(0, -1, 0).applyEuler(lightRotation);
      light.target.position.copy(light.position).add(direction);
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
    // The illuminance view draws calculated light, not rendered light (ADR 0066).
    light.intensity = mode === 'illuminance' ? 0 : peak * level;
    item.flux = product.flux * level;
    for (const material of emissive) {
      material.emissive.copy(light.color);
      material.emissiveIntensity = mode === 'realistic' ? level * EMISSIVE_GAIN : 0;
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
      item.outline = selectionOutline(new THREE.Box3());
      this.group.add(item.outline);
    } else if (!on && item.outline) {
      this.#removeOutline(item);
    }
    if (item.outline) {
      item.fixture.root.updateMatrixWorld(true);
      item.outline.box.setFromObject(item.fixture.root, true).expandByScalar(HIGHLIGHT_MARGIN);
    }
  }

  /**
   * Gives shadows to the brightest lit luminaires, up to SHADOW_BUDGET.
   * Returns the ids of those that must lose theirs. Switching `castShadow`
   * off in place breaks three's WebGPURenderer: materials compiled earlier
   * keep updating the disposed shadow and throw every frame. So those
   * fixtures are rebuilt instead.
   */
  #assignShadows(): string[] {
    const ranked = [...this.#items].sort(([, a], [, b]) => b.flux - a.flux);
    const losing: string[] = [];
    ranked.forEach(([id, item], rank) => {
      const { light } = item.fixture;
      const casts = rank < SHADOW_BUDGET && item.flux > 0;
      if (casts) {
        light.castShadow = true;
        light.shadow.needsUpdate = true;
      } else if (light.castShadow) {
        losing.push(id);
      }
    });
    return losing;
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

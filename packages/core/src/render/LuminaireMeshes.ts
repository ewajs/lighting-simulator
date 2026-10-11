import * as THREE from 'three/webgpu';
import type { Catalog, Luminaire, Room, Scene } from '../types';
import { buildFixture, disposeFixture, type Fixture } from './fixtures';
import { candela, kelvinToRgb } from './lighting';
import type { RenderMode } from './RoomMeshes';

/** Only the brightest few lights cast shadows; the rest still light the scene. */
export const SHADOW_BUDGET = 8;
/** Emissive strength of lit faces, chosen so they read bright under BASE_EXPOSURE. */
const EMISSIVE_GAIN = 160;
const HIGHLIGHT_COLOR = 0xf5b544;
/** Gap between a highlighted fixture and its outline, in m. */
const HIGHLIGHT_MARGIN = 0.04;
const DEG = Math.PI / 180;

interface Item {
  readonly productId: string;
  readonly fixture: Fixture;
  /** Luminous flux currently emitted, in lm (0 when off). */
  flux: number;
  outline?: THREE.Box3Helper;
}

/** Keeps one fixture (mesh + light) per luminaire in sync with the scene. */
export class LuminaireMeshes {
  readonly group = new THREE.Group();
  readonly #items = new Map<string, Item>();
  readonly #catalog: Catalog;

  constructor(catalog: Catalog) {
    this.#catalog = catalog;
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

  /** Shows or hides all highlight outlines without changing which are highlighted. */
  setOutlinesVisible(visible: boolean): void {
    for (const item of this.#items.values()) if (item.outline) item.outline.visible = visible;
  }

  dispose(): void {
    for (const id of [...this.#items.keys()]) this.#remove(id);
  }

  #itemFor(luminaire: Luminaire): Item | undefined {
    const existing = this.#items.get(luminaire.id);
    if (existing?.productId === luminaire.productId) return existing;
    if (existing) this.#remove(luminaire.id);
    const product = this.#catalog.get(luminaire.productId);
    if (!product) return undefined; // Unknown products are skipped, not drawn.
    const item: Item = { productId: product.id, fixture: buildFixture(product), flux: 0 };
    this.group.add(item.fixture.root);
    this.#items.set(luminaire.id, item);
    return item;
  }

  #update(item: Item, luminaire: Luminaire, room: Room, mode: RenderMode): void {
    const product = this.#catalog.get(luminaire.productId)!;
    const { root, light, lightOrigin, emissive, head, cord } = item.fixture;
    const { x, y, z } = luminaire.position;
    root.position.set(x, y, z);
    root.rotation.set(0, product.mount === 'wall' ? yawAwayFromWall(luminaire, room) : 0, 0);

    // Aim: tilt from straight down towards local +z, then pan around the vertical.
    const tilt = luminaire.aim.tiltDeg * DEG;
    const pan = luminaire.aim.panDeg * DEG;
    if (head) head.rotation.set(-tilt, pan, 0, 'YXZ');
    if (light instanceof THREE.SpotLight) {
      const direction = new THREE.Vector3(0, -1, 0).applyEuler(
        new THREE.Euler(-tilt, pan, 0, 'YXZ'),
      );
      light.target.position.copy(lightOrigin).add(direction);
    }
    if (cord) {
      const length = Math.max(0.01, room.height - y);
      cord.scale.y = length;
      cord.position.y = length / 2;
    }

    const level = luminaire.on ? luminaire.dimming : 0;
    const { r, g, b } = kelvinToRgb(luminaire.cct);
    light.color.setRGB(r, g, b, THREE.SRGBColorSpace);
    light.intensity = candela(product) * level;
    item.flux = product.flux * level;
    for (const material of emissive) {
      material.emissive.copy(light.color);
      material.emissiveIntensity = mode === 'clay' ? 0 : level * EMISSIVE_GAIN;
    }
  }

  #outline(item: Item, on: boolean): void {
    if (on && !item.outline) {
      item.outline = new THREE.Box3Helper(new THREE.Box3(), HIGHLIGHT_COLOR);
      (item.outline.material as THREE.Material).depthTest = false;
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
    disposeFixture(item.fixture);
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

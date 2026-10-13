import * as THREE from 'three/webgpu';
import { FINISHES } from '../furniture-kinds';
import type { Furniture, Scene } from '../types';
import { PIECE_BUILDERS } from './furniture/builders';
import { disposePiece } from './furniture/style';
import { outlineMaterial } from './overlay';
import { CLAY_COLOR, type RenderMode } from './RoomMeshes';

/** Gap between a highlighted piece and its outline, in m. */
const HIGHLIGHT_MARGIN = 0.02;
/** Clay furniture is a little rougher than the room, so it reads as matte card. */
const CLAY_ROUGHNESS = 0.9;
const DEG = Math.PI / 180;

interface Item {
  /** The piece as drawn: kind, size and finishes it was built with. */
  piece: Furniture;
  readonly mode: RenderMode;
  readonly root: THREE.Group;
  /** The piece's extent around its own origin, unturned: what the outline follows. */
  readonly bounds: THREE.Box3;
  outline?: THREE.Box3Helper;
}

/**
 * Keeps one built piece per furniture item in sync with the scene (ADR 0047).
 * A piece is rebuilt when its kind, size, finishes or the render mode change;
 * moving or turning it only moves its root.
 */
export class FurnitureMeshes {
  readonly group = new THREE.Group();
  readonly #items = new Map<string, Item>();
  /** In clay mode every part shares these, one per face side. */
  readonly #clay = {
    single: clayMaterial(THREE.FrontSide),
    double: clayMaterial(THREE.DoubleSide),
  };

  sync(scene: Scene, highlighted: readonly string[], mode: RenderMode): void {
    const present = new Set<string>();
    for (const piece of scene.furniture) {
      present.add(piece.id);
      let item = this.#items.get(piece.id);
      if (item && !sameBuild(item, piece, mode)) {
        this.#remove(piece.id);
        item = undefined;
      }
      item ??= this.#build(piece, mode);
      item.piece = piece;
      const { x, y, z } = piece.position;
      item.root.position.set(x, y, z);
      item.root.rotation.set(0, piece.rotationDeg * DEG, 0);
      this.#outline(item, highlighted.includes(piece.id));
    }
    for (const id of [...this.#items.keys()]) if (!present.has(id)) this.#remove(id);
  }

  /** Finds the furniture id an intersected object belongs to. */
  furnitureIdOf(object: THREE.Object3D): string | undefined {
    for (const [id, item] of this.#items) {
      let current: THREE.Object3D | null = object;
      while (current && current !== item.root) current = current.parent;
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
    this.#clay.single.dispose();
    this.#clay.double.dispose();
  }

  #build(piece: Furniture, mode: RenderMode): Item {
    const finishes = { main: FINISHES[piece.finish.main], accent: FINISHES[piece.finish.accent] };
    const root = PIECE_BUILDERS[piece.kind](piece.size, finishes);
    if (mode === 'clay') this.#toClay(root);
    // Measured before it is placed, so the outline can turn with it.
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root, true);
    const item: Item = { piece, mode, root, bounds };
    this.group.add(root);
    this.#items.set(piece.id, item);
    return item;
  }

  /** Swaps every part's material for the shared clay one, freeing the originals. */
  #toClay(root: THREE.Object3D): void {
    const originals = new Set<THREE.Material>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material as THREE.Material;
      originals.add(material);
      object.material = material.side === THREE.DoubleSide ? this.#clay.double : this.#clay.single;
    });
    originals.forEach((material) => material.dispose());
  }

  #outline(item: Item, on: boolean): void {
    if (on && !item.outline) {
      const box = item.bounds.clone().expandByScalar(HIGHLIGHT_MARGIN);
      const outline = new THREE.Box3Helper(box);
      (outline.material as THREE.Material).dispose();
      outline.material = outlineMaterial();
      outline.renderOrder = 1;
      // A child of the piece, so it turns with it; never hit by picking.
      outline.raycast = () => {};
      item.root.add(outline);
      item.outline = outline;
    } else if (!on && item.outline) {
      this.#removeOutline(item);
    }
  }

  #removeOutline(item: Item): void {
    if (!item.outline) return;
    item.root.remove(item.outline);
    item.outline.dispose();
    delete item.outline;
  }

  #remove(id: string): void {
    const item = this.#items.get(id);
    if (!item) return;
    this.#removeOutline(item);
    this.group.remove(item.root);
    // Clay materials are shared and outlive the piece.
    if (item.mode === 'clay') {
      item.root.traverse((object) => {
        if (object instanceof THREE.Mesh) (object.geometry as THREE.BufferGeometry).dispose();
      });
    } else {
      disposePiece(item.root);
    }
    this.#items.delete(id);
  }
}

/** Whether a built item still shows `piece` in `mode`, so only its placement needs updating. */
function sameBuild(item: Item, piece: Furniture, mode: RenderMode): boolean {
  const built = item.piece;
  return (
    item.mode === mode &&
    built.kind === piece.kind &&
    built.size.width === piece.size.width &&
    built.size.depth === piece.size.depth &&
    built.size.height === piece.size.height &&
    built.finish.main === piece.finish.main &&
    built.finish.accent === piece.finish.accent
  );
}

function clayMaterial(side: THREE.Side): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: CLAY_COLOR, roughness: CLAY_ROUGHNESS, side });
}

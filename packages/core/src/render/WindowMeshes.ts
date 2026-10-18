import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import type { GlazingKind, Room, RoomWindow, Scene, WindowCovering } from '../types';
import { windowRect } from '../windows';
import { overlayColor, selectionOutline, tagItem } from './overlay';
import { CLAY_COLOR, type RenderMode } from './RoomMeshes';

/** The frame's bars: their width across the face and depth through the wall, in m. */
const FRAME_WIDTH_M = 0.05;
const FRAME_DEPTH_M = 0.06;
/** A covering hangs this far into the room from the glass, in m. */
const COVERING_OFFSET_M = 0.05;
/** Gap between a highlighted window and its outline, in m. */
const HIGHLIGHT_MARGIN_M = 0.02;
const FRAME_COLOR = '#f2f2ef';
/**
 * What's seen through a window: a pale sky, unlit and in its own colour, just
 * outside the glass. The room floats in an empty scene, so without it a window
 * would show the page's background (ADR 0078). It's the opening's size, so it
 * never shows past the wall's edges; being one flat colour, a backdrop farther
 * out would look no different. Daylight's picture (W7) can change it by the hour.
 */
const OUTSIDE_COLOR = '#d6e4ee';

/**
 * How each glass looks: a tint and how much of what's behind it shows. Clear
 * glass shows nearly all of it, tinted is darker, frosted is milky. A look,
 * not the light: the daylight through it is calculated (ADR 0078).
 */
const GLASS_LOOK: Readonly<
  Record<GlazingKind, { readonly color: string; readonly opacity: number }>
> = {
  clear: { color: '#cfe4ee', opacity: 0.15 },
  tinted: { color: '#3d4a52', opacity: 0.5 },
  frosted: { color: '#eef2f3', opacity: 0.8 },
};
const COVERING_LOOK: Readonly<
  Record<Exclude<WindowCovering, 'none'>, { readonly color: string; readonly opacity: number }>
> = {
  sheer: { color: '#ffffff', opacity: 0.55 },
  blind: { color: '#e8e4dc', opacity: 0.95 },
};

interface Item {
  /** The window as drawn: size, glazing and covering it was built with. */
  window: RoomWindow;
  readonly mode: RenderMode;
  readonly root: THREE.Group;
  /** Its inward normal, in the room: hidden when it faces away from the camera, as its wall is. */
  normal: THREE.Vector3;
  outline?: THREE.Box3Helper;
}

/**
 * Keeps one drawn window per window in the scene (ADR 0078): a frame, its
 * glass and any covering, in the hole RoomMeshes leaves for it. Drawn in the
 * window's own frame: x along its width, y along its height, z into the room.
 */
export class WindowMeshes {
  readonly group = new THREE.Group();
  readonly #items = new Map<string, Item>();

  sync(scene: Scene, highlighted: readonly string[], mode: RenderMode): void {
    const present = new Set<string>();
    for (const window of scene.windows) {
      present.add(window.id);
      let item = this.#items.get(window.id);
      if (item && !sameBuild(item, window, mode)) {
        this.#remove(window.id);
        item = undefined;
      }
      item ??= this.#build(window, mode);
      item.window = window;
      place(item, window, scene.room);
      this.#outline(item, highlighted.includes(window.id));
    }
    for (const id of [...this.#items.keys()]) if (!present.has(id)) this.#remove(id);
  }

  /**
   * Shows each window only from the room's side of its surface, as the room's
   * own surfaces are drawn: from outside, the near walls drop away, and their
   * windows with them.
   */
  updateVisibility(camera: THREE.Camera): void {
    const toCamera = new THREE.Vector3();
    for (const item of this.#items.values()) {
      toCamera.subVectors(camera.position, item.root.position);
      item.root.visible = toCamera.dot(item.normal) > 0;
    }
  }

  /** Shows or hides all highlight outlines without changing which are highlighted. */
  setOutlinesVisible(visible: boolean): void {
    for (const item of this.#items.values()) if (item.outline) item.outline.visible = visible;
  }

  dispose(): void {
    for (const id of [...this.#items.keys()]) this.#remove(id);
  }

  #build(window: RoomWindow, mode: RenderMode): Item {
    const root = new THREE.Group();
    const { width, height } = window;
    const frame = new THREE.MeshStandardMaterial({
      color: mode === 'clay' ? CLAY_COLOR : FRAME_COLOR,
      roughness: 0.5,
    });
    // Four bars around the opening, inside its edges.
    const bar = (w: number, h: number, x: number, y: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, FRAME_DEPTH_M), frame);
      mesh.position.set(x, y, 0);
      mesh.castShadow = true;
      root.add(mesh);
    };
    const [halfW, halfH, inset] = [width / 2, height / 2, FRAME_WIDTH_M / 2];
    bar(width, FRAME_WIDTH_M, 0, halfH - inset);
    bar(width, FRAME_WIDTH_M, 0, -halfH + inset);
    bar(FRAME_WIDTH_M, height - 2 * FRAME_WIDTH_M, halfW - inset, 0);
    bar(FRAME_WIDTH_M, height - 2 * FRAME_WIDTH_M, -halfW + inset, 0);
    // The glass, inside the frame. It casts no shadow: daylight passes through it.
    const look = GLASS_LOOK[window.glazing];
    root.add(
      pane(
        width - FRAME_WIDTH_M,
        height - FRAME_WIDTH_M,
        0,
        mode === 'clay' ? '#ffffff' : look.color,
        look.opacity,
      ),
    );
    const sky = new THREE.MeshBasicNodeMaterial();
    sky.colorNode = overlayColor(color(mode === 'clay' ? '#ffffff' : OUTSIDE_COLOR));
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(width, height), sky);
    outside.position.z = -FRAME_DEPTH_M / 2;
    // Picks and shadows ignore it: it stands for what's outside, not part of the window.
    outside.raycast = () => {};
    root.add(outside);
    if (window.covering !== 'none') {
      const covering = COVERING_LOOK[window.covering];
      root.add(pane(width, height, COVERING_OFFSET_M, covering.color, covering.opacity));
    }
    tagItem(root, window.id);
    const item: Item = { window, mode, root, normal: new THREE.Vector3() };
    this.group.add(root);
    this.#items.set(window.id, item);
    return item;
  }

  #outline(item: Item, on: boolean): void {
    if (on && !item.outline) {
      const { width, height } = item.window;
      const half = new THREE.Vector3(width / 2, height / 2, FRAME_DEPTH_M / 2);
      const box = new THREE.Box3(half.clone().negate(), half).expandByScalar(HIGHLIGHT_MARGIN_M);
      const outline = selectionOutline(box);
      item.root.add(outline);
      item.outline = outline;
    } else if (!on && item.outline) {
      item.root.remove(item.outline);
      item.outline.dispose();
      delete item.outline;
    }
  }

  #remove(id: string): void {
    const item = this.#items.get(id);
    if (!item) return;
    if (item.outline) item.outline.dispose();
    this.group.remove(item.root);
    item.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      (object.geometry as THREE.BufferGeometry).dispose();
      (object.material as THREE.Material).dispose();
    });
    this.#items.delete(id);
  }
}

/** A thin translucent pane `offset` into the room, seen from both sides. */
function pane(
  width: number,
  height: number,
  offset: number,
  color: string,
  opacity: number,
): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.2,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.z = offset;
  return mesh;
}

/** Puts a window's group at its centre, turned so x runs along it, y up it and z into the room. */
function place(item: Item, window: RoomWindow, room: Room): void {
  const { u, v, normal } = windowRect(window, room);
  const [x, y, z] = [
    new THREE.Vector3(u.x, u.y, u.z),
    new THREE.Vector3(v.x, v.y, v.z),
    new THREE.Vector3(normal.x, normal.y, normal.z),
  ];
  // On two walls (u, v, normal) is left-handed, which a rotation can't be;
  // the frame is symmetric, so running x the other way changes nothing seen.
  if (x.clone().cross(y).dot(z) < 0) x.negate();
  const basis = new THREE.Matrix4().makeBasis(x, y, z);
  item.root.quaternion.setFromRotationMatrix(basis);
  item.root.position.set(window.position.x, window.position.y, window.position.z);
  item.normal.set(normal.x, normal.y, normal.z);
}

/** Whether a built item still shows `window` in `mode`, so only its placement needs updating. */
function sameBuild(item: Item, window: RoomWindow, mode: RenderMode): boolean {
  const built = item.window;
  return (
    item.mode === mode &&
    built.width === window.width &&
    built.height === window.height &&
    built.glazing === window.glazing &&
    built.covering === window.covering
  );
}

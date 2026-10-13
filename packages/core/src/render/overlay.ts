// Helpers for editing overlays drawn over the scene (selection outlines and
// handles) and for telling which item a picked object belongs to. See ADRs
// 0039, 0040 and 0048.

import * as THREE from 'three/webgpu';
import { color, toneMappingExposure } from 'three/tsl';

/** Colour of selection outlines. */
const HIGHLIGHT_COLOR = 0xf5b544;
/** Where `tagItem` keeps an item's id in `Object3D.userData`. */
const ITEM_ID_KEY = 'lxsItemId';

/**
 * A colour that reads as itself on screen. The whole frame is exposed for
 * real light levels and tone-mapped, so a plain colour would come out nearly
 * black; dividing the exposure back out undoes most of that.
 */
export function overlayColor(color: THREE.Node<'color'>): THREE.Node<'vec3'> {
  // The typings don't see the renderer reference as a float node.
  return color.div(toneMappingExposure as unknown as THREE.Node<'float'>);
}

/** World size of one CSS pixel at `point`, for handles that keep a constant size on screen. */
export function worldPerPixel(
  camera: THREE.PerspectiveCamera,
  point: THREE.Vector3,
  viewportHeightPx: number,
): number {
  const forward = camera.getWorldDirection(new THREE.Vector3());
  const depth = Math.max(point.clone().sub(camera.position).dot(forward), camera.near);
  return (2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / viewportHeightPx;
}

/**
 * A selection outline around `box`: drawn through other objects, in a colour
 * that reads as itself, and never hit by picking.
 */
export function selectionOutline(box: THREE.Box3): THREE.Box3Helper {
  const outline = new THREE.Box3Helper(box);
  (outline.material as THREE.Material).dispose();
  const material = new THREE.LineBasicNodeMaterial({ depthTest: false });
  material.colorNode = overlayColor(color(HIGHLIGHT_COLOR));
  outline.material = material;
  outline.renderOrder = 1;
  outline.raycast = () => {};
  return outline;
}

/** Marks `root` as what is drawn for the luminaire or piece `id`, for `itemIdOf`. */
export function tagItem(root: THREE.Object3D, id: string): void {
  root.userData[ITEM_ID_KEY] = id;
}

/** The id of the luminaire or piece an object is part of: the tag on it or its nearest tagged ancestor. */
export function itemIdOf(object: THREE.Object3D): string | undefined {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    const id: unknown = current.userData[ITEM_ID_KEY];
    if (typeof id === 'string') return id;
  }
  return undefined;
}

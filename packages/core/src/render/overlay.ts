// Helpers for editing overlays drawn over the scene: selection outlines and
// handles. See ADRs 0039 and 0040.

import * as THREE from 'three/webgpu';
import { color, toneMappingExposure } from 'three/tsl';

/** Colour of selection outlines. */
const HIGHLIGHT_COLOR = 0xf5b544;

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

/** A selection outline's line material: drawn through other objects, in a colour that reads as itself. */
export function outlineMaterial(): THREE.LineBasicNodeMaterial {
  const material = new THREE.LineBasicNodeMaterial({ depthTest: false });
  material.colorNode = overlayColor(color(HIGHLIGHT_COLOR));
  return material;
}

import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import type { Guide } from '../snap';
import type { Room } from '../types';
import { overlayColor } from './overlay';

/** Distinct from the amber selection: guides are about other things lining up. */
const GUIDE_COLOR = 0x5ab0ff;
const DASH_M = 0.08;
const GAP_M = 0.05;
/** Drawn with the handles, over the scene. */
const RENDER_ORDER = 2;

/**
 * Dashed lines across the room showing what a dragged luminaire lines up
 * with (ADR 0041): one along z for an x alignment, one along x for z.
 */
export class SnapGuides {
  readonly group = new THREE.Group();
  readonly #material = new THREE.LineDashedNodeMaterial({
    dashSize: DASH_M,
    gapSize: GAP_M,
    depthTest: false,
    depthWrite: false,
  });
  readonly #lines: Record<Guide['axis'], THREE.Line>;

  constructor() {
    this.#material.colorNode = overlayColor(color(GUIDE_COLOR));
    this.#lines = { x: this.#line(), z: this.#line() };
  }

  /** Shows `guides` at height `y` across the room; an empty list hides them. */
  show(guides: readonly Guide[], y: number, room: Room): void {
    for (const line of Object.values(this.#lines)) line.visible = false;
    for (const { axis, value } of guides) {
      const line = this.#lines[axis];
      const half = (axis === 'x' ? room.depth : room.width) / 2;
      const ends =
        axis === 'x'
          ? [new THREE.Vector3(value, y, -half), new THREE.Vector3(value, y, half)]
          : [new THREE.Vector3(-half, y, value), new THREE.Vector3(half, y, value)];
      line.geometry.setFromPoints(ends);
      line.computeLineDistances();
      line.visible = true;
    }
  }

  dispose(): void {
    for (const line of Object.values(this.#lines)) line.geometry.dispose();
    this.#material.dispose();
  }

  #line(): THREE.Line {
    const line = new THREE.Line(new THREE.BufferGeometry(), this.#material);
    line.renderOrder = RENDER_ORDER;
    line.frustumCulled = false; // Its bounds change with every drag.
    line.visible = false;
    this.group.add(line);
    return line;
  }
}

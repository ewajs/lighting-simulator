import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import type { Dimension } from '../measure';
import { overlayColor } from './overlay';

/** The snap guides' blue: both are about where things sit in the room. */
const LINE_COLOR = 0x5ab0ff;
/** Length of the tick across each end, in m. */
const TICK_M = 0.08;
/** Drawn with the handles, over the scene. */
const RENDER_ORDER = 2;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Lines from a moving luminaire to the walls and floor, with a tick at each
 * end (ADR 0042). Their lengths are labelled by the host, from
 * `Viewport.onMeasure`.
 */
export class DimensionLines {
  readonly #material = new THREE.LineBasicNodeMaterial({ depthTest: false, depthWrite: false });
  readonly #lines = new THREE.LineSegments(new THREE.BufferGeometry(), this.#material);

  constructor() {
    this.#material.colorNode = overlayColor(color(LINE_COLOR));
    this.#lines.renderOrder = RENDER_ORDER;
    this.#lines.frustumCulled = false; // Its bounds change with every move.
    this.#lines.visible = false;
  }

  /** The object to add to the scene. */
  get object(): THREE.Object3D {
    return this.#lines;
  }

  /** Draws these dimensions; an empty list hides them. */
  show(dimensions: readonly Dimension[]): void {
    this.#lines.visible = dimensions.length > 0;
    const points: THREE.Vector3[] = [];
    for (const { from, to } of dimensions) {
      const start = new THREE.Vector3(from.x, from.y, from.z);
      const end = new THREE.Vector3(to.x, to.y, to.z);
      points.push(start, end);
      // Ticks lie across the line: horizontal for horizontal lines, along x for vertical ones.
      const along = end.clone().sub(start).normalize();
      const across = Math.abs(along.y) > 0.5 ? new THREE.Vector3(1, 0, 0) : along.cross(UP);
      const half = across.normalize().multiplyScalar(TICK_M / 2);
      for (const point of [start, end]) {
        points.push(point.clone().sub(half), point.clone().add(half));
      }
    }
    this.#lines.geometry.setFromPoints(points);
  }

  dispose(): void {
    this.#lines.geometry.dispose();
    this.#material.dispose();
  }
}

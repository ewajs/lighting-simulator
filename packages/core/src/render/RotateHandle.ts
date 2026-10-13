import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import type { Vec3 } from '../types';
import { ACTIVE_HANDLE_COLOR, HIGHLIGHT_COLOR, overlayColor, worldPerPixel } from './overlay';

/** How far the ring clears the corners of the piece's footprint, in m. */
const RING_CLEARANCE = 0.12;
/** The least radius on screen, in CSS px: clear of the move arrows (68 px) around small pieces. */
const MIN_RADIUS_PX = 84;
/** The ring's thickness on screen, in CSS px, as for the aim handle's ring. */
const TUBE_PX = 1.5;
/** Half the width of the ring's invisible grab band: about a fingertip. */
const PICK_TUBE_PX = 11;
const RING_SEGMENTS = 128;
const TUBE_SEGMENTS = 8;
/** The tube is rebuilt when its thickness on screen drifts by more than this share, e.g. on zooming. */
const RESIZE_TOLERANCE = 0.25;
/** Drawn after the outlines (renderOrder 1), on top of everything. */
const RENDER_ORDER = 2;

/**
 * The rotation ring for one piece of furniture (ADR 0049): it lies on the
 * floor around the piece, clear of its footprint and, around small pieces,
 * of the move arrows. Its thickness stays the same on screen.
 */
export class RotateHandle {
  readonly group = new THREE.Group();
  readonly #color = uniform(new THREE.Color(HIGHLIGHT_COLOR));
  readonly #material = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
  readonly #pickerMaterial = new THREE.MeshBasicMaterial({ visible: false });
  readonly #ring: THREE.Mesh;
  readonly #picker: THREE.Mesh;
  /** The radius that clears the footprint, in m. */
  #clearRadius = 0;
  /** The world size of a pixel the ring was last built for; 0 when it must be rebuilt. */
  #builtPerPx = 0;

  constructor() {
    this.#material.colorNode = overlayColor(this.#color);
    this.#ring = new THREE.Mesh(new THREE.BufferGeometry(), this.#material);
    this.#ring.renderOrder = RENDER_ORDER;
    this.#picker = new THREE.Mesh(new THREE.BufferGeometry(), this.#pickerMaterial);
    // Tori lie in the xy plane; turned flat, the ring circles the vertical.
    for (const mesh of [this.#ring, this.#picker]) mesh.rotation.x = Math.PI / 2;
    this.group.add(this.#ring, this.#picker);
    this.group.visible = false;
  }

  /**
   * Shows the ring around a piece standing at `center` with a footprint of
   * `width` × `depth`, or hides it (null).
   */
  show(center: Vec3 | null, width = 0, depth = 0): void {
    this.group.visible = center !== null;
    if (!center) return;
    this.group.position.set(center.x, center.y, center.z);
    const radius = Math.hypot(width, depth) / 2 + RING_CLEARANCE;
    if (radius !== this.#clearRadius) {
      this.#clearRadius = radius;
      this.#builtPerPx = 0;
    }
  }

  /** Highlights the ring while it's hovered or dragged. */
  setActive(active: boolean): void {
    this.#color.value.setHex(active ? ACTIVE_HANDLE_COLOR : HIGHLIGHT_COLOR);
  }

  /** Whether the ray passes through the ring's grab band. */
  isAt(raycaster: THREE.Raycaster): boolean {
    return this.group.visible && raycaster.intersectObject(this.#picker, false).length > 0;
  }

  /** Keeps the ring's thickness, and its least radius, constant on screen. Call before each render. */
  update(camera: THREE.PerspectiveCamera, viewportHeightPx: number): void {
    if (!this.group.visible || viewportHeightPx === 0) return;
    const perPx = worldPerPixel(camera, this.group.position, viewportHeightPx);
    const drift = this.#builtPerPx === 0 ? Infinity : Math.abs(perPx / this.#builtPerPx - 1);
    if (drift > RESIZE_TOLERANCE) {
      this.#builtPerPx = perPx;
      const radius = Math.max(this.#clearRadius, MIN_RADIUS_PX * perPx);
      this.#build(this.#ring, radius, TUBE_PX * perPx);
      this.#build(this.#picker, radius, PICK_TUBE_PX * perPx);
    }
    this.group.updateMatrixWorld(true);
  }

  dispose(): void {
    this.#ring.geometry.dispose();
    this.#picker.geometry.dispose();
    this.#material.dispose();
    this.#pickerMaterial.dispose();
  }

  #build(mesh: THREE.Mesh, radius: number, tube: number): void {
    mesh.geometry.dispose();
    mesh.geometry = new THREE.TorusGeometry(radius, tube, TUBE_SEGMENTS, RING_SEGMENTS);
  }
}

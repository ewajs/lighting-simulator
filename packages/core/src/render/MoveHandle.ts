import * as THREE from 'three/webgpu';
import { toneMappingExposure, uniform } from 'three/tsl';
import type { MoveAxis } from '../move-handle';
import type { Vec3 } from '../types';

// Sizes are in CSS px on screen: the handle is rescaled every frame so it
// keeps the same size however far away it is.
/** Empty space around the centre, so the fixture underneath can still be grabbed. */
const CENTER_GAP_PX = 16;
/** From the gap to the arrow tip. */
const ARROW_LENGTH_PX = 52;
const SHAFT_RADIUS_PX = 1.5;
const HEAD_LENGTH_PX = 13;
const HEAD_RADIUS_PX = 5.5;
/** Radius of the invisible grab area around each arrow: about a fingertip wide. */
const PICK_RADIUS_PX = 14;
const RADIAL_SEGMENTS = 16;

/** The usual x / y / z colours, so they read like the inspector's X, Height, Z fields. */
const AXIS_COLORS: Readonly<Record<MoveAxis, number>> = {
  x: 0xe5534b,
  y: 0x57ab5a,
  z: 0x4a8fdd,
};
/** The axis being hovered or dragged; the selection outline colour. */
const ACTIVE_COLOR = 0xf5b544;
/** Drawn after the outlines (renderOrder 1), on top of everything. */
const RENDER_ORDER = 2;

/** Turns geometry built along +y to point along each axis. */
const AXIS_ROTATIONS: Readonly<Record<MoveAxis, THREE.Euler>> = {
  x: new THREE.Euler(0, 0, -Math.PI / 2),
  y: new THREE.Euler(0, 0, 0),
  z: new THREE.Euler(Math.PI / 2, 0, 0),
};

interface Arrow {
  readonly root: THREE.Group;
  readonly material: THREE.MeshBasicNodeMaterial;
  readonly color: THREE.UniformNode<'color', THREE.Color>;
}

/**
 * Double-headed arrows over the selection, one per axis it can slide along
 * (ADR 0039). Each has a wider invisible picker for grabbing it.
 */
export class MoveHandle {
  readonly group = new THREE.Group();
  readonly #arrows = new Map<MoveAxis, Arrow>();
  readonly #geometries: THREE.BufferGeometry[] = [];
  readonly #pickerMaterial = new THREE.MeshBasicMaterial({ visible: false });
  #active: MoveAxis | null = null;

  constructor() {
    this.group.visible = false;
    for (const axis of ['x', 'y', 'z'] as const) this.#arrows.set(axis, this.#arrow(axis));
  }

  /** Shows arrows for `axes` at `center`, or hides the handle when there are none. */
  show(center: Vec3 | null, axes: readonly MoveAxis[]): void {
    this.group.visible = center !== null && axes.length > 0;
    if (center) this.group.position.set(center.x, center.y, center.z);
    for (const [axis, arrow] of this.#arrows) arrow.root.visible = axes.includes(axis);
  }

  /** Highlights the axis being hovered or dragged. */
  setActive(axis: MoveAxis | null): void {
    if (axis === this.#active) return;
    this.#active = axis;
    for (const [name, { color }] of this.#arrows) {
      color.value.setHex(name === axis ? ACTIVE_COLOR : AXIS_COLORS[name]);
    }
  }

  /**
   * The visible axis whose grab area the ray passes through, if any. Never
   * within the centre gap on screen: an arrow pointing at the camera would
   * otherwise cover the fixture underneath.
   */
  axisAt(raycaster: THREE.Raycaster): MoveAxis | null {
    if (!this.group.visible) return null;
    // The group's scale is the world size of one screen pixel at the handle.
    const fromCenterPx = raycaster.ray.distanceToPoint(this.group.position) / this.group.scale.x;
    if (fromCenterPx < CENTER_GAP_PX) return null;
    const pickers = [...this.#arrows.values()]
      .filter(({ root }) => root.visible)
      .flatMap(({ root }) => root.children.filter((child) => child.userData.picker === true));
    const hit = raycaster.intersectObjects(pickers, false)[0];
    return (hit?.object.userData.axis as MoveAxis | undefined) ?? null;
  }

  /** Keeps a constant size on screen. Call before each render. */
  update(camera: THREE.PerspectiveCamera, viewportHeightPx: number): void {
    if (!this.group.visible || viewportHeightPx === 0) return;
    const forward = camera.getWorldDirection(new THREE.Vector3());
    const depth = this.group.position.clone().sub(camera.position).dot(forward);
    const worldPerPx =
      (2 * Math.max(depth, camera.near) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
      viewportHeightPx;
    this.group.scale.setScalar(worldPerPx);
    this.group.updateMatrixWorld(true);
  }

  dispose(): void {
    this.#geometries.forEach((geometry) => geometry.dispose());
    this.#pickerMaterial.dispose();
    for (const { material } of this.#arrows.values()) material.dispose();
  }

  /** Two arrows pointing away from the centre, plus their pickers, along one axis. */
  #arrow(axis: MoveAxis): Arrow {
    const color = uniform(new THREE.Color(AXIS_COLORS[axis]));
    const material = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
    // The whole frame is exposed for real light levels; divide that back out so the colour
    // reads as itself. The typings don't see the renderer reference as a float node.
    material.colorNode = color.div(toneMappingExposure as unknown as THREE.Node<'float'>);
    const shaftLength = ARROW_LENGTH_PX - HEAD_LENGTH_PX;
    const shaft = this.#geometry(
      new THREE.CylinderGeometry(SHAFT_RADIUS_PX, SHAFT_RADIUS_PX, shaftLength, RADIAL_SEGMENTS),
      CENTER_GAP_PX + shaftLength / 2,
    );
    const head = this.#geometry(
      new THREE.ConeGeometry(HEAD_RADIUS_PX, HEAD_LENGTH_PX, RADIAL_SEGMENTS),
      CENTER_GAP_PX + shaftLength + HEAD_LENGTH_PX / 2,
    );
    const picker = this.#geometry(
      new THREE.CylinderGeometry(PICK_RADIUS_PX, PICK_RADIUS_PX, ARROW_LENGTH_PX, RADIAL_SEGMENTS),
      CENTER_GAP_PX + ARROW_LENGTH_PX / 2,
    );

    const root = new THREE.Group();
    root.rotation.copy(AXIS_ROTATIONS[axis]);
    for (const direction of [1, -1]) {
      const flip = new THREE.Euler(direction === 1 ? 0 : Math.PI, 0, 0);
      for (const geometry of [shaft, head]) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.copy(flip);
        mesh.renderOrder = RENDER_ORDER;
        root.add(mesh);
      }
      const pick = new THREE.Mesh(picker, this.#pickerMaterial);
      pick.rotation.copy(flip);
      pick.userData = { picker: true, axis };
      root.add(pick);
    }
    this.group.add(root);
    return { root, material, color };
  }

  /** Geometry built along +y, moved out so its centre sits at `offsetPx` from the handle's centre. */
  #geometry(geometry: THREE.BufferGeometry, offsetPx: number): THREE.BufferGeometry {
    geometry.translate(0, offsetPx, 0);
    this.#geometries.push(geometry);
    return geometry;
  }
}

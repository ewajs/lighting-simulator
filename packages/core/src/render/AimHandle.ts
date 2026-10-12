import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import type { Vec3 } from '../types';
import { overlayColor, worldPerPixel } from './overlay';

// Sizes are in CSS px on screen; the ring and marker are rescaled every frame.
/** The rotation ring's radius, clear of the move-drag area over the fixture. */
const RING_RADIUS_PX = 46;
const RING_TUBE_PX = 1.5;
/** Half the width of the ring's invisible grab band: about a fingertip. */
const RING_PICK_TUBE_PX = 11;
const MARKER_RADIUS_PX = 7;
const MARKER_PICK_RADIUS_PX = 16;
const RING_SEGMENTS = 96;
const SPHERE_SEGMENTS = 16;

/** The selection outline colour: the handle reads as part of the selection, and shows on white walls. */
const IDLE_COLOR = 0xf5b544;
/** The part being hovered or dragged. */
const ACTIVE_COLOR = 0xff6a2b;
/** Drawn after the outlines (renderOrder 1), on top of everything. */
const RENDER_ORDER = 2;

/** The aim handle's draggable parts: the beam's landing point, and the ring that turns pan. */
export type AimPart = 'point' | 'ring';

/**
 * Aims one luminaire (ADR 0040): a marker where the beam centre lands, joined
 * to the luminaire by a line, and a horizontal ring around it for pan.
 */
export class AimHandle {
  readonly group = new THREE.Group();
  readonly #ring = new THREE.Group();
  readonly #marker = new THREE.Group();
  readonly #line: THREE.Line;
  readonly #colors: Record<AimPart, THREE.UniformNode<'color', THREE.Color>> = {
    point: uniform(new THREE.Color(IDLE_COLOR)),
    ring: uniform(new THREE.Color(IDLE_COLOR)),
  };
  readonly #disposables: { dispose(): void }[] = [];
  #active: AimPart | null = null;

  constructor() {
    const ringMaterial = this.#material(this.#colors.ring);
    const pointMaterial = this.#material(this.#colors.point);
    const pickerMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.#disposables.push(pickerMaterial);

    // Tori lie in the xy plane; turned flat, the ring circles the vertical.
    this.#ring.add(
      this.#mesh(
        new THREE.TorusGeometry(RING_RADIUS_PX, RING_TUBE_PX, 8, RING_SEGMENTS),
        ringMaterial,
      ),
      this.#picker(
        new THREE.TorusGeometry(RING_RADIUS_PX, RING_PICK_TUBE_PX, 8, RING_SEGMENTS),
        pickerMaterial,
        'ring',
      ),
    );
    this.#ring.rotation.x = Math.PI / 2;
    this.#marker.add(
      this.#mesh(
        new THREE.SphereGeometry(MARKER_RADIUS_PX, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
        pointMaterial,
      ),
      this.#picker(new THREE.SphereGeometry(MARKER_PICK_RADIUS_PX, 8, 8), pickerMaterial, 'point'),
    );

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const lineMaterial = new THREE.LineBasicNodeMaterial({ depthTest: false, depthWrite: false });
    lineMaterial.colorNode = overlayColor(this.#colors.point);
    this.#disposables.push(lineGeometry, lineMaterial);
    this.#line = new THREE.Line(lineGeometry, lineMaterial);
    this.#line.renderOrder = RENDER_ORDER;
    this.#line.frustumCulled = false; // Its bounds change with every aim.

    this.group.add(this.#line, this.#ring, this.#marker);
    this.group.visible = false;
  }

  /** Shows the handle for a luminaire at `from` whose beam lands at `to`, or hides it (null). */
  show(from: Vec3 | null, to: Vec3 = { x: 0, y: 0, z: 0 }): void {
    this.group.visible = from !== null;
    if (!from) return;
    this.#ring.position.set(from.x, from.y, from.z);
    this.#marker.position.set(to.x, to.y, to.z);
    const positions = this.#line.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, from.x, from.y, from.z);
    positions.setXYZ(1, to.x, to.y, to.z);
    positions.needsUpdate = true;
  }

  /** Highlights the part being hovered or dragged. */
  setActive(part: AimPart | null): void {
    if (part === this.#active) return;
    this.#active = part;
    for (const [name, color] of Object.entries(this.#colors)) {
      color.value.setHex(name === part ? ACTIVE_COLOR : IDLE_COLOR);
    }
  }

  /** The part whose grab area the ray passes through. The marker wins: it's where people aim. */
  partAt(raycaster: THREE.Raycaster): AimPart | null {
    if (!this.group.visible) return null;
    const pickers = [this.#marker, this.#ring].flatMap((part) =>
      part.children.filter((child) => child.userData.part !== undefined),
    );
    const hits = raycaster.intersectObjects(pickers, false);
    const parts = hits.map((hit) => hit.object.userData.part as AimPart);
    return parts.includes('point') ? 'point' : (parts[0] ?? null);
  }

  /** Keeps the ring and marker a constant size on screen. Call before each render. */
  update(camera: THREE.PerspectiveCamera, viewportHeightPx: number): void {
    if (!this.group.visible || viewportHeightPx === 0) return;
    for (const part of [this.#ring, this.#marker]) {
      part.scale.setScalar(worldPerPixel(camera, part.position, viewportHeightPx));
    }
    this.group.updateMatrixWorld(true);
  }

  dispose(): void {
    this.#disposables.forEach((item) => item.dispose());
  }

  #material(color: THREE.UniformNode<'color', THREE.Color>): THREE.MeshBasicNodeMaterial {
    const material = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
    material.colorNode = overlayColor(color);
    this.#disposables.push(material);
    return material;
  }

  #mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    this.#disposables.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = RENDER_ORDER;
    return mesh;
  }

  #picker(geometry: THREE.BufferGeometry, material: THREE.Material, part: AimPart): THREE.Mesh {
    this.#disposables.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { part };
    return mesh;
  }
}

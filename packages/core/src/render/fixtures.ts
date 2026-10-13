import * as THREE from 'three/webgpu';
import { DEG } from '../math';
import type { Product } from '../types';
import { IesLight } from './IesLight';
import { isSpot } from './lighting';

/** Default height of a floor or table lamp when the product doesn't say, in m. */
const FLOOR_LAMP_HEIGHT = 1.5;
const TABLE_LAMP_HEIGHT = 0.45;
const BODY_COLOR = 0x1b1b1d;
/**
 * The beam angle is where intensity drops to 50%; light keeps spreading to
 * the field angle (~10%), typically ~1.3× wider. The spotlight cone covers the field.
 */
const FIELD_TO_BEAM_RATIO = 1.3;
/** three.js spotlights need a half-angle below 90°. */
const MAX_SPOT_HALF_ANGLE_DEG = 80;
/** Shadow map resolution for spotlights. Point lights keep three.js' default (512, ×6 faces). */
const SPOT_SHADOW_MAP_SIZE = 1024;
/** Softness of the spotlight edge, 0–1. */
const SPOT_PENUMBRA = 0.45;
const CORD_RADIUS = 0.003;

// Model conventions (ADR 0043).
/** Node marking where the light sits; default: the model's origin. */
const LIGHT_NODE = 'light';
/** Node that turns with the aim. */
const HEAD_NODE = 'head';
/** Nodes marking where pendant cords attach; default: one at the origin. */
const CORD_PREFIX = 'cord';
/** Materials that glow with the light's colour and dimming. */
const EMISSIVE_PREFIX = 'emissive';

/** A pendant cord, stretched from its anchor up to the ceiling. */
export interface Cord {
  readonly mesh: THREE.Mesh;
  /** Where it attaches, in the fixture's frame. */
  readonly anchor: THREE.Vector3;
}

/** The three.js objects that make up one placed luminaire. */
export interface Fixture {
  readonly root: THREE.Group;
  readonly light: THREE.SpotLight | THREE.PointLight | IesLight;
  /** Light position in the root's frame, before aiming. */
  readonly lightOrigin: THREE.Vector3;
  /** Glowing surfaces (lens, diffuser, shade). */
  readonly emissive: readonly THREE.MeshStandardMaterial[];
  /** Part that turns with the aim (track heads). */
  readonly head?: THREE.Object3D;
  /** Pendant cords; none for other mounts. */
  readonly cords: readonly Cord[];
  /** Frees what the fixture owns. A model's shared geometry stays with its template. */
  readonly dispose: () => void;
}

/** The visible part of a fixture, before its light and cords are added. */
interface Shape {
  readonly root: THREE.Group;
  readonly emissive: THREE.MeshStandardMaterial[];
  readonly head?: THREE.Object3D;
  readonly lightOrigin: THREE.Vector3;
  readonly cordAnchors: readonly THREE.Vector3[];
  /** Geometries and materials this fixture alone uses. */
  readonly owned: { dispose(): void }[];
}

/**
 * Builds a product's fixture: its 3D model when one is given (conventions in
 * ADR 0043), otherwise simple placeholder geometry for its mount type. Then
 * its light: an IES light when a profile is given, otherwise a spot or point
 * light estimated from flux and beam. Units are metres; the root's origin is
 * the luminaire position.
 */
export function buildFixture(
  product: Product,
  profile?: THREE.DataTexture,
  model?: THREE.Object3D,
): Fixture {
  const { root, emissive, head, lightOrigin, cordAnchors, owned } = model
    ? modelShape(model)
    : placeholderShape(product);
  const cords = product.mount === 'pendant' ? cordAnchors.map((anchor) => cord(anchor, owned)) : [];
  for (const { mesh } of cords) root.add(mesh);

  const light = createLight(product, profile);
  light.decay = 2;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.02;
  light.shadow.camera.near = 0.05;
  // The scene is static between edits; LuminaireMeshes requests shadow updates.
  light.shadow.autoUpdate = false;
  if (light instanceof THREE.SpotLight) {
    const halfFieldDeg = (product.beamDeg / 2) * FIELD_TO_BEAM_RATIO;
    light.angle = Math.min(MAX_SPOT_HALF_ANGLE_DEG, halfFieldDeg) * DEG;
    light.penumbra = SPOT_PENUMBRA;
    light.shadow.mapSize.set(SPOT_SHADOW_MAP_SIZE, SPOT_SHADOW_MAP_SIZE);
    root.add(light.target);
  }
  light.position.copy(lightOrigin);
  root.add(light);

  const dispose = () => {
    light.dispose();
    owned.forEach((item) => item.dispose());
  };
  return { root, light, lightOrigin, emissive, ...(head && { head }), cords, dispose };
}

/**
 * A per-luminaire copy of a model. Geometry and most materials stay shared
 * with the template; `emissive…` materials are copied, since each luminaire
 * glows with its own colour and dimming.
 */
function modelShape(template: THREE.Object3D): Shape {
  const root = new THREE.Group().add(template.clone(true));
  const emissive: THREE.MeshStandardMaterial[] = [];
  const owned: THREE.Material[] = [];
  const ownCopy = (material: THREE.Material) => {
    if (!material.name.startsWith(EMISSIVE_PREFIX)) return material;
    const copy = material.clone();
    owned.push(copy);
    if (copy instanceof THREE.MeshStandardMaterial) emissive.push(copy);
    return copy;
  };
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(ownCopy)
      : ownCopy(mesh.material);
  });

  root.updateMatrixWorld(true);
  const positionOf = (object: THREE.Object3D) => object.getWorldPosition(new THREE.Vector3());
  const light = root.getObjectByName(LIGHT_NODE);
  const head = root.getObjectByName(HEAD_NODE);
  const cordAnchors: THREE.Vector3[] = [];
  root.traverse((object) => {
    if (object.name.startsWith(CORD_PREFIX)) cordAnchors.push(positionOf(object));
  });
  return {
    root,
    emissive,
    ...(head && { head }),
    lightOrigin: light ? positionOf(light) : new THREE.Vector3(),
    cordAnchors: cordAnchors.length > 0 ? cordAnchors : [new THREE.Vector3()],
    owned,
  };
}

/** Simple stand-in geometry for a product without a model. */
function placeholderShape(product: Product): Shape {
  const root = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({
    color: BODY_COLOR,
    roughness: 0.5,
    metalness: 0.3,
  });
  const emissive: THREE.MeshStandardMaterial[] = [];
  const glow = () => {
    const material = new THREE.MeshStandardMaterial({ color: 0x000000, side: THREE.DoubleSide });
    emissive.push(material);
    return material;
  };
  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    y = 0,
    parent: THREE.Object3D = root,
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    parent.add(mesh);
    return mesh;
  };
  const facingDown = (mesh: THREE.Mesh) => mesh.rotateX(Math.PI / 2);

  let lightY = 0;
  let head: THREE.Object3D | undefined;

  switch (product.mount) {
    case 'recessed':
      add(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 32), body, -0.006);
      facingDown(add(new THREE.CircleGeometry(0.032, 32), glow(), -0.013));
      lightY = -0.03;
      break;
    case 'track':
      head = new THREE.Group();
      head.position.y = -0.1;
      root.add(head);
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 24), body, 0, head);
      facingDown(add(new THREE.CircleGeometry(0.03, 24), glow(), -0.056, head));
      lightY = -0.18;
      break;
    case 'pendant':
      add(new THREE.ConeGeometry(0.3, 0.12, 48, 1, true), body);
      facingDown(add(new THREE.CircleGeometry(0.28, 48), glow(), -0.058));
      lightY = -0.1;
      break;
    case 'wall': {
      // Local +z points into the room; LuminaireMeshes turns the root away from its wall.
      const box = add(new THREE.BoxGeometry(0.1, 0.1, 0.1), body);
      box.position.z = 0.05;
      const lens = facingDown(add(new THREE.PlaneGeometry(0.06, 0.06), glow(), -0.051));
      lens.position.z = 0.05;
      lightY = -0.07;
      break;
    }
    case 'floor':
    case 'table': {
      const height = product.mount === 'floor' ? FLOOR_LAMP_HEIGHT : TABLE_LAMP_HEIGHT;
      const shadeRadius = product.mount === 'floor' ? 0.19 : 0.11;
      add(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 32), body, 0.01);
      add(new THREE.CylinderGeometry(0.01, 0.01, height * 0.75, 8), body, height * 0.375);
      add(
        new THREE.CylinderGeometry(shadeRadius, shadeRadius * 1.15, height * 0.22, 40, 1, true),
        glow(),
        height * 0.85,
      );
      lightY = height * 0.85;
      break;
    }
  }

  const owned: { dispose(): void }[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
      owned.push(mesh.geometry, mesh.material);
    }
  });
  const lightOrigin = new THREE.Vector3(0, lightY, product.mount === 'wall' ? 0.05 : 0);
  return {
    root,
    emissive,
    ...(head && { head }),
    lightOrigin,
    cordAnchors: [new THREE.Vector3()],
    owned,
  };
}

/** A unit-length cord, rescaled by LuminaireMeshes to reach the ceiling. */
function cord(anchor: THREE.Vector3, owned: { dispose(): void }[]): Cord {
  const geometry = new THREE.CylinderGeometry(CORD_RADIUS, CORD_RADIUS, 1, 6);
  const material = new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.5 });
  owned.push(geometry, material);
  return { mesh: new THREE.Mesh(geometry, material), anchor };
}

function createLight(product: Product, profile: THREE.DataTexture | undefined): Fixture['light'] {
  if (profile) {
    const light = new IesLight();
    light.profile = profile;
    return light;
  }
  return isSpot(product) ? new THREE.SpotLight() : new THREE.PointLight();
}

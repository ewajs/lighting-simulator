import * as THREE from 'three/webgpu';
import type { Product } from '../types';
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

/** The three.js objects that make up one placed luminaire. */
export interface Fixture {
  readonly root: THREE.Group;
  readonly light: THREE.SpotLight | THREE.PointLight;
  /** Light position in the root's frame, before aiming. */
  readonly lightOrigin: THREE.Vector3;
  /** Glowing surfaces (lens, diffuser, shade). */
  readonly emissive: readonly THREE.MeshStandardMaterial[];
  /** Part that turns with the aim (track heads). */
  readonly head?: THREE.Object3D;
  /** Pendant cord, scaled to reach the ceiling. */
  readonly cord?: THREE.Mesh;
}

/**
 * Builds simple placeholder geometry for a product's mount type, plus its
 * light. Real fixture models (glTF) come later. Units are metres; the root's
 * origin is the luminaire position.
 */
export function buildFixture(product: Product): Fixture {
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
  let cord: THREE.Mesh | undefined;

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
      cord = add(new THREE.CylinderGeometry(0.003, 0.003, 1, 6), body);
      add(new THREE.ConeGeometry(0.3, 0.12, 48, 1, true), body.clone());
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

  const light = isSpot(product) ? new THREE.SpotLight() : new THREE.PointLight();
  light.decay = 2;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.02;
  light.shadow.camera.near = 0.05;
  // The scene is static between edits; LuminaireMeshes requests shadow updates.
  light.shadow.autoUpdate = false;
  if (light instanceof THREE.SpotLight) {
    const halfFieldDeg = (product.beamDeg / 2) * FIELD_TO_BEAM_RATIO;
    light.angle = Math.min(MAX_SPOT_HALF_ANGLE_DEG, halfFieldDeg) * (Math.PI / 180);
    light.penumbra = SPOT_PENUMBRA;
    light.shadow.mapSize.set(SPOT_SHADOW_MAP_SIZE, SPOT_SHADOW_MAP_SIZE);
    root.add(light.target);
  }
  const lightOrigin = new THREE.Vector3(0, lightY, product.mount === 'wall' ? 0.05 : 0);
  light.position.copy(lightOrigin);
  root.add(light);

  return { root, light, lightOrigin, emissive, ...(head && { head }), ...(cord && { cord }) };
}

/** Disposes every geometry and material under the fixture. */
export function disposeFixture(fixture: Fixture): void {
  fixture.light.dispose();
  fixture.root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  });
}

// Development page for designing furniture (ADR 0047): renders pieces in a
// neutral studio, with `?piece=sofa` for one piece and `?angle=30` to turn it.
// Not shipped: open /furniture-preview.html with `npm run dev`.

import * as THREE from 'three/webgpu';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FINISHES } from '../../../../packages/core/src/furniture-kinds';
import { BEDROOM } from './pieces-bedroom';
import { REFERENCE } from './pieces-reference';
import { SEATING } from './pieces-seating';
import { STORAGE } from './pieces-storage';
import { TABLES } from './pieces-tables';
import type { PreviewPiece } from './preview-types';

/** Groups for `?group=`; with no parameters, the reference arrangement. */
const GROUPS: Record<string, Record<string, PreviewPiece>> = {
  reference: REFERENCE,
  seating: SEATING,
  tables: TABLES,
  storage: STORAGE,
  bedroom: BEDROOM,
};
const ALL: Record<string, PreviewPiece> = Object.fromEntries(
  Object.values(GROUPS).flatMap((pieces) => Object.entries(pieces)),
);

const params = new URLSearchParams(location.search);
const only = params.get('piece');
const group = GROUPS[params.get('group') ?? 'reference'] ?? REFERENCE;
const angle = THREE.MathUtils.degToRad(Number(params.get('angle') ?? 0));

const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.AgXToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#ece8e2');

// A studio corner: a warm floor and a soft white wall.
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 14),
  new THREE.MeshStandardMaterial({ color: '#a99a87', roughness: 0.85 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 6),
  new THREE.MeshStandardMaterial({ color: '#efebe5', roughness: 0.95 }),
);
wall.position.set(0, 3, -1.6);
wall.receiveShadow = true;
scene.add(floor, wall);

scene.add(new THREE.HemisphereLight('#fff6ec', '#a39886', 0.35));
const sun = new THREE.DirectionalLight('#fff0dc', 3.6);
sun.position.set(3.5, 6, 4.5);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.radius = 6;
sun.shadow.bias = -0.0003;
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 });
scene.add(sun);

const selected = only ? { [only]: ALL[only]! } : group;
const built = new THREE.Group();
for (const { build, size, main, accent, at, turnDeg = 0, onWall } of Object.values(selected)) {
  const piece = build(size, { main: FINISHES[main], accent: FINISHES[accent] });
  if (onWall) {
    // On the back wall, facing the room; alone, at eye height in front of the camera.
    piece.position.set(only ? 0 : at[0], only ? size.height / 2 + 0.9 : at[1], wall.position.z);
  } else {
    piece.position.set(only ? 0 : at[0], 0, only ? 0 : at[1]);
    piece.rotation.y = THREE.MathUtils.degToRad(turnDeg) + angle;
  }
  built.add(piece);
}
scene.add(built);

const camera = new THREE.PerspectiveCamera(only ? 30 : 34, innerWidth / innerHeight, 0.05, 60);
if (only) {
  // Frame what was built, not the nominal size: the TV and sculptures stand above it.
  const bounds = new THREE.Box3().setFromObject(built).getBoundingSphere(new THREE.Sphere());
  const distance = (bounds.radius * 1.15) / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
  const onWall = ALL[only]!.onWall ?? false;
  const view = new THREE.Vector3(onWall ? 0.25 : 0.55, onWall ? 0.1 : 0.42, 1).normalize();
  camera.position.copy(bounds.center).addScaledVector(view, distance);
  camera.lookAt(bounds.center);
} else {
  camera.position.set(0.9, 2.4, 6.0);
  camera.lookAt(-0.2, 0.5, 0);
}

await renderer.init();
// Soft studio light from every side, and gentle reflections on wood and metal.
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(
  new RoomEnvironment(),
  0.04,
).texture;
scene.environmentIntensity = 0.3;
renderer.setSize(innerWidth, innerHeight, false);
await renderer.setAnimationLoop(() => renderer.render(scene, camera));
document.body.dataset.ready = 'true';

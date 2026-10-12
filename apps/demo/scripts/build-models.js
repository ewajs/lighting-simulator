// Generates the demo's fixture models (public/models/*.glb) from simple
// shapes at each product's approximate size. They stand in for the models a
// manufacturer would upload. Run with `node apps/demo/scripts/build-models.js`
// and commit the output. Conventions (ADR 0043): metres, Y up, origin at the
// mounting point, front towards +Z; nodes `light`, `head` and `cord…`;
// materials named `emissive…` glow.

// A Node script; ESLint here only knows browser-neutral globals.
/* global console, URL */

import { writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// The exporter reads its output Blob with FileReader, which Node lacks.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    void blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};

const OUT_DIR = new URL('../public/models/', import.meta.url);
const SEGMENTS = 48;

const material = (name, color, { metalness = 0, roughness = 0.6 } = {}) =>
  new THREE.MeshStandardMaterial({ name, color, metalness, roughness });
const WHITE_TRIM = material('trim', 0xf2f2f0, { roughness: 0.5 });
const BLACK = material('body', 0x1c1c1e, { metalness: 0.3, roughness: 0.45 });
const ALUMINIUM = material('body', 0xc9cbcd, { metalness: 0.6, roughness: 0.35 });
const BRONZE = material('body', 0x3b342d, { metalness: 0.4, roughness: 0.5 });
const SHIELD = material('shield', 0x2a2a2a, { roughness: 0.7 });
const lens = () =>
  new THREE.MeshStandardMaterial({ name: 'emissive', color: 0xf4f4f2, side: THREE.DoubleSide });

function mesh(geometry, meshMaterial, [x, y, z] = [0, 0, 0], name = '') {
  const result = new THREE.Mesh(geometry, meshMaterial);
  result.position.set(x, y, z);
  result.name = name;
  return result;
}

function node(name, [x, y, z]) {
  const result = new THREE.Object3D();
  result.name = name;
  result.position.set(x, y, z);
  return result;
}

/** A disc lying flat at height `y` (and depth `z`), facing down or up. */
function disc(radius, y, meshMaterial, { up = false, z = 0 } = {}) {
  const result = mesh(new THREE.CircleGeometry(radius, SEGMENTS), meshMaterial, [0, y, z]);
  result.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
  return result;
}

/** Recessed downlight: a white trim flush with the ceiling around a diffuse lens. */
function downlight({ trimRadius, lensRadius }) {
  const root = new THREE.Group();
  root.add(
    mesh(
      new THREE.CylinderGeometry(trimRadius, trimRadius, 0.008, SEGMENTS),
      WHITE_TRIM,
      [0, -0.004, 0],
    ),
    disc(lensRadius, -0.0085, lens()),
    node('light', [0, -0.03, 0]),
  );
  return root;
}

const models = {
  // Cooper LX6: 6 in aperture, ~190 mm trim.
  'ies-downlight': () => downlight({ trimRadius: 0.095, lensRadius: 0.068 }),

  // Lightolier Calculite 3 in wall washer: the kicker hides the half away
  // from the wall, which the throw (+Z, C0) faces.
  'ies-wall-washer': () => {
    const root = downlight({ trimRadius: 0.057, lensRadius: 0.04 });
    const kicker = mesh(
      new THREE.CircleGeometry(0.0405, SEGMENTS, Math.PI / 2, Math.PI),
      SHIELD,
      [0, -0.009, 0],
    );
    kicker.rotation.x = Math.PI / 2;
    root.add(kicker);
    return root;
  },

  // Track spot (iGuzzini): an adapter on the track, a stem and a round head
  // that turns on its pivot. Front (+Z) is where the head tilts to.
  'ies-track-spot': () => {
    const head = new THREE.Group();
    head.name = 'head';
    head.position.set(0, -0.1, 0);
    head.add(
      mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.15, SEGMENTS), BLACK),
      disc(0.036, -0.0755, lens()),
    );
    const root = new THREE.Group();
    root.add(
      mesh(new THREE.BoxGeometry(0.04, 0.035, 0.12), BLACK, [0, -0.0175, 0]),
      mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 16), BLACK, [0, -0.055, 0]),
      head,
      node('light', [0, -0.18, 0]),
    );
    return root;
  },

  // Finelite HP-2, 4 ft: a 1.22 m aluminium profile along Z (C0 runs along
  // the length), lit below and above, hung from a cable at each end.
  'ies-linear-pendant': () => {
    const length = 1.22;
    const root = new THREE.Group();
    const below = mesh(new THREE.PlaneGeometry(0.048, length - 0.03), lens(), [0, -0.0505, 0]);
    below.rotation.x = Math.PI / 2;
    const above = mesh(new THREE.PlaneGeometry(0.048, length - 0.03), lens(), [0, 0.0005, 0]);
    above.rotation.x = -Math.PI / 2;
    root.add(
      mesh(new THREE.BoxGeometry(0.06, 0.05, length), ALUMINIUM, [0, -0.025, 0]),
      below,
      above,
      node('light', [0, -0.025, 0]),
      node('cord-front', [0, 0, length / 2 - 0.06]),
      node('cord-back', [0, 0, -(length / 2 - 0.06)]),
    );
    return root;
  },

  // Visa Colonnade: a half cylinder against the wall (Z = 0), lit through
  // both ends. +Z points into the room.
  'ies-wall-up-down': () => {
    const radius = 0.07;
    const height = 0.32;
    const shell = mesh(
      // Theta −90°…90° is the half towards +Z.
      new THREE.CylinderGeometry(radius, radius, height, SEGMENTS, 1, true, -Math.PI / 2, Math.PI),
      BRONZE,
    );
    const back = mesh(new THREE.PlaneGeometry(2 * radius, height), BRONZE, [0, 0, 0.001]);
    // Half discs on the room side: the lower half of the circle faces up once turned, the upper half down.
    const cap = (y, up) => {
      const half = mesh(
        new THREE.CircleGeometry(radius * 0.97, SEGMENTS, up ? Math.PI : 0, Math.PI),
        lens(),
        [0, y, 0],
      );
      half.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
      return half;
    };
    const root = new THREE.Group();
    root.add(
      shell,
      back,
      cap(height / 2 - 0.001, true),
      cap(-(height / 2 - 0.001), false),
      node('light', [0, 0, radius / 2]),
    );
    return root;
  },
};

const exporter = new GLTFExporter();
for (const [productId, build] of Object.entries(models)) {
  const glb = await exporter.parseAsync(build(), { binary: true });
  await writeFile(new URL(`${productId}.glb`, OUT_DIR), new Uint8Array(glb));
  console.log(`${productId}.glb: ${glb.byteLength} bytes`);
}

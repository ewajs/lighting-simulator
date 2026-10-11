import * as THREE from 'three/webgpu';
import { getProduct } from '../data/catalog.js';
import { kelvinToColor } from './color.js';

const SHADOW_BUDGET = 8;
const DEG = Math.PI / 180;
/** Emissive multiplier so lit faces read as "bright" under the calibrated exposure. */
const EMISSIVE_GAIN = 160;
const SELECTION_COLOR = 0xf5b544;

/**
 * Turns `state.luminaires` into lights + simple fixture meshes.
 *
 * MVP photometry: lumens → candela using the beam angle (spot) or an isotropic
 * distribution (wide). This will be replaced by IES profiles (IESSpotLight)
 * once product photometry is attached — see docs/SPEC.md §4.3.
 */
export class LuminaireLayer {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'luminaires';
    scene.add(this.group);
    /** @type {Map<string, {productId:string, root:THREE.Group, light:THREE.Light, emissive:THREE.MeshStandardMaterial[], helper?:THREE.Box3Helper}>} */
    this.items = new Map();

    // Cheap stand-in for inter-reflections until a proper indirect solution exists.
    this.bounce = new THREE.HemisphereLight(0xffffff, 0xffffff, 0);
    scene.add(this.bounce);
  }

  sync({ luminaires, room, selection, view }) {
    const seen = new Set();
    for (const lum of luminaires) {
      seen.add(lum.id);
      let item = this.items.get(lum.id);
      if (!item || item.productId !== lum.productId) {
        if (item) this.#dispose(lum.id);
        item = this.#create(lum);
        if (!item) continue;
        this.items.set(lum.id, item);
      }
      this.#update(item, lum, room, selection.includes(lum.id), view);
    }
    for (const id of [...this.items.keys()]) if (!seen.has(id)) this.#dispose(id);

    this.#assignShadows(luminaires);
    for (const item of this.items.values()) item.light.shadow.needsUpdate = true;
    this.#updateBounce(luminaires, room);
  }

  /** Meshes that can be clicked to select a luminaire. */
  pickables() {
    return [...this.items.values()].map((i) => i.root);
  }

  #create(lum) {
    const product = getProduct(lum.productId);
    if (!product) return null;
    const root = new THREE.Group();
    root.userData.lumId = lum.id;
    const body = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.5, metalness: 0.3 });
    const emissive = [];
    const glow = () => {
      const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, side: THREE.DoubleSide });
      emissive.push(m);
      return m;
    };

    let light;
    if (product.distribution === 'spot') {
      light = new THREE.SpotLight(0xffffff, 0, 0, Math.min(80, product.beam * 0.65) * DEG, 0.45, 2);
      light.target.position.set(0, -1, 0);
      root.add(light.target);
    } else {
      light = new THREE.PointLight(0xffffff, 0, 0, 2);
    }
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = 0.02;
    light.shadow.camera.near = 0.05;
    // The scene is static between edits, so shadow maps are only re-rendered in sync().
    light.shadow.autoUpdate = false;
    root.add(light);

    const add = (geo, mat, y = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.y = y;
      root.add(m);
      return m;
    };

    switch (product.mount) {
      case 'recessed': {
        add(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 32), body, -0.006);
        const disc = add(new THREE.CircleGeometry(0.032, 32), glow(), -0.013);
        disc.rotation.x = Math.PI / 2;
        light.position.y = -0.03;
        break;
      }
      case 'track': {
        const head = new THREE.Group();
        head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 24), body));
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), glow());
        lens.rotation.x = Math.PI / 2;
        lens.position.y = -0.056;
        head.add(lens);
        head.position.y = -0.1;
        root.add(head);
        root.userData.head = head;
        light.position.y = -0.18;
        break;
      }
      case 'pendant': {
        const cord = add(new THREE.CylinderGeometry(0.003, 0.003, 1, 6), body);
        root.userData.cord = cord;
        add(new THREE.ConeGeometry(0.3, 0.12, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide }), 0);
        const diffuser = add(new THREE.CircleGeometry(0.28, 48), glow(), -0.058);
        diffuser.rotation.x = Math.PI / 2;
        light.position.y = -0.1;
        break;
      }
      case 'wall': {
        add(new THREE.BoxGeometry(0.1, 0.1, 0.1), body, 0).position.z = 0.05;
        const lens = add(new THREE.PlaneGeometry(0.06, 0.06), glow(), -0.051);
        lens.position.z = 0.05;
        lens.rotation.x = Math.PI / 2;
        light.position.set(0, -0.07, 0.05);
        light.target?.position.set(0, -1, 0.15);
        break;
      }
      case 'floor':
      case 'table': {
        const h = product.height ?? 1.5;
        const isTable = product.mount === 'table';
        add(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 32), body, 0.01);
        add(new THREE.CylinderGeometry(0.01, 0.01, h * 0.75, 8), body, h * 0.375);
        const shadeR = isTable ? 0.11 : 0.19;
        add(new THREE.CylinderGeometry(shadeR, shadeR * 1.15, h * 0.22, 40, 1, true), glow(), h * 0.85);
        light.position.y = h * 0.85;
        break;
      }
    }
    this.group.add(root);
    return { productId: lum.productId, root, light, emissive, product };
  }

  #update(item, lum, room, selected, view) {
    const { root, light, emissive, product } = item;
    root.position.set(...lum.position);

    // Orientation: wall fixtures face away from the nearest wall, aimable heads tilt/pan.
    root.rotation.set(0, 0, 0);
    if (product.mount === 'wall') root.rotation.y = nearestWallYaw(lum.position, room);
    const head = root.userData.head;
    if (light.isSpotLight && (head || product.mount === 'recessed')) {
      const { tilt, pan } = lum.aim;
      root.rotation.y = pan * DEG;
      if (head) head.rotation.x = tilt * DEG;
      const dir = new THREE.Vector3(0, -1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt * DEG);
      light.target.position.copy(light.position).add(dir);
      if (head) light.position.set(0, -0.1, 0).add(dir.clone().multiplyScalar(0.08));
    }
    if (root.userData.cord) {
      const len = Math.max(0.01, room.height - lum.position[1]);
      root.userData.cord.scale.y = len;
      root.userData.cord.position.y = len / 2;
    }

    // Light output
    const level = lum.on ? lum.dimming : 0;
    const color = kelvinToColor(lum.cct ?? product.cct);
    light.color.copy(color);
    light.intensity = candela(product) * level;
    for (const m of emissive) {
      m.emissive.copy(color);
      m.emissiveIntensity = view.renderMode === 'clay' ? 0 : level * EMISSIVE_GAIN;
      m.color.set(lum.on ? 0x000000 : 0x8a8a8a);
    }
    light.userData.flux = product.lumens * level;

    // Selection outline
    if (selected && !item.helper) {
      item.helper = new THREE.Box3Helper(new THREE.Box3(), SELECTION_COLOR);
      item.helper.material.depthTest = false;
      item.helper.renderOrder = 10;
      this.group.add(item.helper);
    } else if (!selected && item.helper) {
      this.#removeHelper(item);
    }
    if (item.helper) {
      root.updateMatrixWorld(true);
      item.helper.box.setFromObject(root, true).expandByScalar(0.04);
    }
  }

  /** Only the brightest few lights cast shadows; the rest still illuminate. */
  #assignShadows(luminaires) {
    const ranked = luminaires
      .map((l) => this.items.get(l.id))
      .filter(Boolean)
      .sort((a, b) => b.light.userData.flux - a.light.userData.flux);
    ranked.forEach((item, i) => {
      const cast = i < SHADOW_BUDGET && item.light.userData.flux > 0;
      if (item.light.castShadow !== cast) {
        item.light.castShadow = cast;
        const size = item.light.isPointLight ? 512 : 1024;
        item.light.shadow.mapSize.set(size, size);
      }
    });
  }

  /**
   * Uniform indirect term from the integrating-sphere approximation:
   *   E_ind = Φ · ρ̄ / (A · (1 − ρ̄))
   * Gives a plausible fill level that responds to surface reflectances.
   */
  #updateBounce(luminaires, room) {
    const { width: w, depth: d, height: h, surfaces } = room;
    const aFloor = w * d, aWalls = 2 * (w + d) * h;
    const area = 2 * aFloor + aWalls;
    const rho = (aFloor * (surfaces.floor.reflectance + surfaces.ceiling.reflectance) + aWalls * surfaces.walls.reflectance) / area;
    let flux = 0;
    for (const l of luminaires) flux += this.items.get(l.id)?.light.userData.flux ?? 0;
    this.bounce.intensity = (flux * rho) / (area * (1 - rho)) + 1.5; // + tiny floor so it's never pitch black
  }

  #removeHelper(item) {
    this.group.remove(item.helper);
    item.helper.dispose();
    item.helper = undefined;
  }

  #dispose(id) {
    const item = this.items.get(id);
    if (!item) return;
    if (item.helper) this.#removeHelper(item);
    item.light.shadow?.map?.dispose();
    item.root.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose?.();
    });
    this.group.remove(item.root);
    this.items.delete(id);
  }
}

/** Peak-ish intensity in candela. Spot: flux spread over the beam cone. Wide: isotropic. */
function candela(product) {
  if (product.distribution === 'spot') {
    const half = (product.beam / 2) * DEG;
    return (product.lumens * 0.85) / (2 * Math.PI * (1 - Math.cos(half)));
  }
  return product.lumens / (4 * Math.PI);
}

function nearestWallYaw([x, , z], room) {
  const dists = [
    [room.depth / 2 + z, 0], // back wall (−z) → face +z
    [room.depth / 2 - z, Math.PI], // front wall
    [room.width / 2 + x, Math.PI / 2], // left wall
    [room.width / 2 - x, -Math.PI / 2], // right wall
  ];
  return dists.sort((a, b) => a[0] - b[0])[0][1];
}

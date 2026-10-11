import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomBuilder } from './RoomBuilder.js';
import { LuminaireLayer } from './LuminaireLayer.js';

/**
 * Maps physical luminance to display values. Scenes are lit in real units
 * (cd, lx), so a white wall at ~100 lx has a radiance of ~25; this brings
 * typical interiors (100–500 lx) into the tone mapper's range. User exposure
 * is applied on top in EV stops.
 */
const BASE_EXPOSURE = 0.025;
const VIEW_TWEEN_MS = 450;

export class Viewport {
  /** @param {HTMLElement} container */
  constructor(container, { store, actions }) {
    this.container = container;
    this.store = store;
    this.actions = actions;
    this.listeners = { stats: new Set() };
  }

  async init() {
    const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.AgXToneMapping;
    // Transparent clear: the themed CSS background shows through instead of being tone-mapped.
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    await renderer.init();
    this.renderer = renderer;
    this.backend = renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2';
    this.container.prepend(renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 40;

    this.room = new RoomBuilder(this.scene);
    this.luminaires = new LuminaireLayer(this.scene);

    this.#bindPicking();
    new ResizeObserver(() => this.#resize()).observe(this.container);
    this.#resize();

    this.store.subscribe((s, prev) => this.#sync(s, prev));
    this.#sync(this.store.get(), null);
    this.setPreset(this.store.get().view.preset, { instant: true });

    let frames = 0, lastStat = performance.now();
    renderer.setAnimationLoop((t) => {
      this.#tween?.(t);
      this.controls.update();
      renderer.render(this.scene, this.camera);
      if (this.#screenshot) {
        this.#screenshot(renderer.domElement.toDataURL('image/png'));
        this.#screenshot = null;
      }
      frames++;
      if (t - lastStat > 500) {
        const fps = (frames * 1000) / (t - lastStat);
        for (const fn of this.listeners.stats) fn({ fps, backend: this.backend });
        frames = 0;
        lastStat = t;
      }
    });
  }

  /** Where a screen point lands on the floor plane, clamped to the room; null if it misses. */
  pointOnFloor(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (!hit) return null;
    const { width, depth } = this.store.get().room;
    return [THREE.MathUtils.clamp(hit.x, -width / 2, width / 2), THREE.MathUtils.clamp(hit.z, -depth / 2, depth / 2)];
  }

  onStats(fn) {
    this.listeners.stats.add(fn);
  }

  /** Resolves with a PNG data URL of the next rendered frame. */
  screenshot() {
    return new Promise((resolve) => (this.#screenshot = resolve));
  }
  #screenshot = null;

  setPreset(preset, { instant = false } = {}) {
    const { width: w, depth: d, height: h } = this.store.get().room;
    const size = Math.max(w, d);
    const target = new THREE.Vector3(0, h * 0.4, 0);
    const positions = {
      perspective: new THREE.Vector3(w * 0.85, h * 1.9, d * 1.35 + 1),
      top: new THREE.Vector3(0, size * 2.4, 0.001),
      front: new THREE.Vector3(0, h * 0.55, d / 2 + size * 1.6),
      side: new THREE.Vector3(w / 2 + size * 1.6, h * 0.55, 0),
    };
    if (preset === 'top') target.set(0, 0, 0);
    this.#flyTo(positions[preset] ?? positions.perspective, target, instant);
  }

  /** Centre the camera on the current selection (or the whole room). */
  frameSelection() {
    const { luminaires, selection } = this.store.get();
    const sel = luminaires.filter((l) => selection.includes(l.id));
    if (!sel.length) return this.setPreset(this.store.get().view.preset);
    const center = sel.reduce((c, l) => c.add(new THREE.Vector3(...l.position)), new THREE.Vector3()).divideScalar(sel.length);
    const offset = this.camera.position.clone().sub(this.controls.target).setLength(3);
    this.#flyTo(center.clone().add(offset), center, false);
  }

  #tween = null;
  #flyTo(position, target, instant) {
    if (instant) {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      return;
    }
    const p0 = this.camera.position.clone(), t0 = this.controls.target.clone();
    let start = null;
    this.#tween = (now) => {
      start ??= now;
      const k = Math.min(1, (now - start) / VIEW_TWEEN_MS);
      const e = 1 - Math.pow(1 - k, 3);
      this.camera.position.lerpVectors(p0, position, e);
      this.controls.target.lerpVectors(t0, target, e);
      if (k === 1) this.#tween = null;
    };
  }

  #sync(s, prev) {
    const roomChanged = !prev || s.room !== prev.room || s.view.renderMode !== prev.view.renderMode;
    if (roomChanged) this.room.update(s.room, s.view.renderMode);
    if (roomChanged || s.luminaires !== prev.luminaires || s.selection !== prev.selection) {
      this.luminaires.sync(s);
    }
    this.renderer.toneMappingExposure = BASE_EXPOSURE * Math.pow(2, s.view.exposure);
    if (prev && s.view.preset !== prev.view.preset) this.setPreset(s.view.preset);
  }

  #resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Click (not drag) on a fixture selects it; Shift adds to the selection; empty space clears. */
  #bindPicking() {
    const el = this.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    let down = null;
    el.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, this.camera);
      const hit = raycaster.intersectObjects(this.luminaires.pickables(), true)[0];
      let id = null;
      for (let o = hit?.object; o && !id; o = o.parent) id = o.userData.lumId ?? null;
      if (id) e.shiftKey ? this.actions.toggleInSelection(id) : this.actions.select([id]);
      else if (!e.shiftKey) this.actions.select([]);
    });
  }
}

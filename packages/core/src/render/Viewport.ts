import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Simulator } from '../simulator';
import type { FloorPoint, Scene } from '../types';
import {
  indirectIlluminance,
  MIN_FILL_LUX,
  toneMappingExposure,
  viewPose,
  type ViewName,
} from './lighting';
import { LuminaireMeshes } from './LuminaireMeshes';
import { RoomMeshes, type RenderMode } from './RoomMeshes';

/** Pointer movement allowed between press and release for it to count as a click, in px. */
/** Pointer movement allowed for a press to still count as a click or tap, in px. Fingers wobble more than mice. */
const TAP_TOLERANCE_PX = { mouse: 4, other: 10 };
/** How long a touch or pen must stay still to count as a long press, in ms. */
export const LONG_PRESS_MS = 500;
const VIEW_TRANSITION_MS = 450;
/** Camera distance when framing a selection, in m. */
const FRAME_DISTANCE = 3;

/** Options for `Viewport.screenshot()`. */
export interface ScreenshotOptions {
  /** CSS colour painted behind the scene; without it, empty areas are transparent. */
  readonly background?: string;
}

interface PendingCapture {
  readonly options: ScreenshotOptions;
  readonly resolve: (png: Blob) => void;
  readonly reject: (error: unknown) => void;
}

export interface ViewportOptions {
  readonly simulator: Simulator;
  /** Element the canvas is added to. The viewport fills it and follows its size. */
  readonly container: HTMLElement;
}

/** A click in the viewport. `luminaireId` is null when no fixture was hit. */
export interface PickEvent {
  readonly luminaireId: string | null;
  readonly event: PointerEvent;
  /**
   * True when a touch or pen was held still for LONG_PRESS_MS. Fired while the
   * finger is still down; hosts usually treat it like Shift-click.
   */
  readonly longPress: boolean;
}

/**
 * Draws a Simulator's scene with three.js. Follows the three.js lifecycle:
 * construct, `await init()`, and `dispose()` when done.
 *
 * ```ts
 * const viewport = new Viewport({ simulator, container });
 * await viewport.init();
 * viewport.onPick(({ luminaireId }) => viewport.setHighlighted(luminaireId ? [luminaireId] : []));
 * ```
 *
 * The viewport has no selection of its own: it reports picks and highlights
 * whatever the host asks for.
 */
export class Viewport {
  readonly #simulator: Simulator;
  readonly #container: HTMLElement;
  readonly #renderer = new THREE.WebGPURenderer({ antialias: true, alpha: true });
  readonly #scene = new THREE.Scene();
  readonly #camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
  readonly #controls: OrbitControls;
  readonly #room = new RoomMeshes();
  readonly #luminaires: LuminaireMeshes;
  // Uniform stand-in for inter-reflections (SPEC §6).
  readonly #bounce = new THREE.HemisphereLight(0xffffff, 0xffffff, 0);
  readonly #pickListeners = new Set<(pick: PickEvent) => void>();
  readonly #resizeObserver = new ResizeObserver(() => this.#resize());
  #unsubscribe: (() => void) | undefined;
  #unsubscribePhotometry: (() => void) | undefined;
  #renderMode: RenderMode = 'realistic';
  #exposureEv = 0;
  #highlighted: readonly string[] = [];
  #transition: ((now: number) => void) | undefined;
  #press:
    | { readonly event: PointerEvent; readonly timer: number | undefined; longPressed: boolean }
    | undefined;
  #captures: PendingCapture[] = [];
  #started = false;

  constructor({ simulator, container }: ViewportOptions) {
    this.#simulator = simulator;
    this.#container = container;
    this.#luminaires = new LuminaireMeshes(simulator.catalog, (productId) =>
      simulator.photometry(productId),
    );
    this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
    this.#controls.enableDamping = true;
    this.#controls.maxPolarAngle = Math.PI * 0.495; // Stay above the floor.
    this.#controls.maxDistance = 40;
    this.#scene.add(this.#room.group, this.#luminaires.group, this.#bounce);
  }

  /** Starts the renderer (WebGPU, or WebGL 2 as fallback) and begins drawing. */
  async init(): Promise<void> {
    const renderer = this.#renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.setClearColor(0x000000, 0); // Transparent: the host's background shows through.
    renderer.shadowMap.enabled = true;
    await renderer.init();

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.#onPointerDown);
    canvas.addEventListener('pointermove', this.#onPointerMove);
    canvas.addEventListener('pointerup', this.#onPointerUp);
    canvas.addEventListener('pointercancel', this.#cancelPress);
    this.#container.append(canvas);
    this.#resizeObserver.observe(this.#container);
    this.#resize();

    this.#unsubscribe = this.#simulator.subscribe((scene, previous) => this.#sync(scene, previous));
    // Fixtures are rebuilt from a product's photometry once its file arrives.
    this.#unsubscribePhotometry = this.#simulator.onPhotometry(() =>
      this.#sync(this.#simulator.scene, undefined),
    );
    this.#sync(this.#simulator.scene, undefined);
    this.setView('perspective', { animate: false });

    await renderer.setAnimationLoop((now) => {
      this.#transition?.(now);
      this.#controls.update();
      if (this.#captures.length > 0) this.#renderCaptures();
      else renderer.render(this.#scene, this.#camera);
    });
    this.#started = true;
  }

  /** Which backend three.js picked. Available after init(). */
  get backend(): 'WebGPU' | 'WebGL 2' {
    return (this.#renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend
      ? 'WebGPU'
      : 'WebGL 2';
  }

  get renderMode(): RenderMode {
    return this.#renderMode;
  }

  set renderMode(mode: RenderMode) {
    this.#renderMode = mode;
    this.#sync(this.#simulator.scene, undefined);
  }

  /** User exposure in EV stops; 0 is the calibrated default. */
  get exposureEv(): number {
    return this.#exposureEv;
  }

  set exposureEv(ev: number) {
    this.#exposureEv = ev;
    this.#renderer.toneMappingExposure = toneMappingExposure(ev);
  }

  /**
   * A PNG of the next frame at the canvas resolution, without highlight
   * outlines (they're an editing aid, not part of the scene).
   */
  screenshot(options: ScreenshotOptions = {}): Promise<Blob> {
    if (!this.#started)
      return Promise.reject(new Error('Viewport.screenshot() called before init()'));
    return new Promise((resolve, reject) => this.#captures.push({ options, resolve, reject }));
  }

  /** Moves the camera to a preset view of the room. */
  setView(view: ViewName, { animate = true } = {}): void {
    const { position, target } = viewPose(
      view,
      this.#simulator.scene.room,
      this.#camera.aspect,
      this.#camera.fov,
    );
    this.#flyTo(
      new THREE.Vector3(position.x, position.y, position.z),
      new THREE.Vector3(target.x, target.y, target.z),
      animate,
    );
  }

  /** Centres the camera on the given luminaires, keeping the current viewing direction. */
  frame(ids: readonly string[]): void {
    const positions = this.#simulator.scene.luminaires
      .filter((l) => ids.includes(l.id))
      .map((l) => l.position);
    if (positions.length === 0) return;
    const center = new THREE.Vector3();
    for (const { x, y, z } of positions) center.add(new THREE.Vector3(x, y, z));
    center.divideScalar(positions.length);
    const offset = this.#camera.position
      .clone()
      .sub(this.#controls.target)
      .setLength(FRAME_DISTANCE);
    this.#flyTo(center.clone().add(offset), center, true);
  }

  /**
   * Where a screen point (e.g. a drop) lands on the floor, clamped to the room.
   * Returns null when the point is above the horizon.
   */
  pointOnFloor(clientX: number, clientY: number): FloorPoint | null {
    const raycaster = this.#raycasterAt(clientX, clientY);
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = raycaster.ray.intersectPlane(floor, new THREE.Vector3());
    if (!hit) return null;
    const { width, depth } = this.#simulator.scene.room;
    return {
      x: THREE.MathUtils.clamp(hit.x, -width / 2, width / 2),
      z: THREE.MathUtils.clamp(hit.z, -depth / 2, depth / 2),
    };
  }

  /** Outlines these luminaires (e.g. the host's selection). */
  setHighlighted(ids: readonly string[]): void {
    this.#highlighted = ids;
    this.#luminaires.sync(this.#simulator.scene, ids, this.#renderMode);
  }

  /** Calls `listener` on every click in the viewport. Returns an unsubscribe function. */
  onPick(listener: (pick: PickEvent) => void): () => void {
    this.#pickListeners.add(listener);
    return () => this.#pickListeners.delete(listener);
  }

  /** Stops drawing and frees GPU resources. The canvas is removed from the container. */
  dispose(): void {
    // Both return promises only to wait for init(), which has already happened.
    void this.#renderer.setAnimationLoop(null);
    this.#cancelPress();
    for (const { reject } of this.#captures) reject(new Error('Viewport disposed'));
    this.#captures = [];
    this.#unsubscribe?.();
    this.#unsubscribePhotometry?.();
    this.#resizeObserver.disconnect();
    this.#controls.dispose();
    this.#room.dispose();
    this.#luminaires.dispose();
    this.#renderer.domElement.remove();
    void this.#renderer.dispose();
  }

  /**
   * Renders one frame without outlines and copies it for each pending capture.
   * The copy must happen in the same task as the render: a WebGPU canvas's
   * contents are only readable until the frame is presented.
   */
  #renderCaptures(): void {
    const captures = this.#captures;
    this.#captures = [];
    const source = this.#renderer.domElement;
    this.#luminaires.setOutlinesVisible(false);
    this.#renderer.render(this.#scene, this.#camera);
    for (const { options, resolve, reject } of captures) {
      const copy = document.createElement('canvas');
      copy.width = source.width;
      copy.height = source.height;
      const context = copy.getContext('2d');
      if (!context) {
        reject(new Error('2D canvas unavailable for screenshot'));
        continue;
      }
      if (options.background) {
        context.fillStyle = options.background;
        context.fillRect(0, 0, copy.width, copy.height);
      }
      context.drawImage(source, 0, 0);
      copy.toBlob(
        (png) => (png ? resolve(png) : reject(new Error('PNG encoding failed'))),
        'image/png',
      );
    }
    this.#luminaires.setOutlinesVisible(true);
  }

  #sync(scene: Scene, previous: Scene | undefined): void {
    if (scene.room !== previous?.room) this.#room.update(scene.room, this.#renderMode);
    this.#luminaires.sync(scene, this.#highlighted, this.#renderMode);
    this.#bounce.intensity =
      indirectIlluminance(this.#luminaires.totalFlux(), scene.room) + MIN_FILL_LUX;
    this.#renderer.toneMappingExposure = toneMappingExposure(this.#exposureEv);
  }

  #resize(): void {
    const { clientWidth: width, clientHeight: height } = this.#container;
    if (width === 0 || height === 0) return;
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
  }

  #flyTo(position: THREE.Vector3, target: THREE.Vector3, animate: boolean): void {
    if (!animate) {
      this.#camera.position.copy(position);
      this.#controls.target.copy(target);
      // Orient now rather than on the next controls.update(), so picking works before the first frame.
      this.#camera.lookAt(target);
      return;
    }
    const fromPosition = this.#camera.position.clone();
    const fromTarget = this.#controls.target.clone();
    let start: number | undefined;
    this.#transition = (now) => {
      start ??= now;
      const t = Math.min(1, (now - start) / VIEW_TRANSITION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      this.#camera.position.lerpVectors(fromPosition, position, eased);
      this.#controls.target.lerpVectors(fromTarget, target, eased);
      if (t === 1) this.#transition = undefined;
    };
  }

  /**
   * A ray from the camera through a screen point. World matrices are brought up
   * to date first: three.js only updates them when it renders, so objects added
   * since the last frame (e.g. restored by undo), or the camera itself before
   * the first frame, would otherwise be in the wrong place.
   */
  #raycasterAt(clientX: number, clientY: number): THREE.Raycaster {
    this.#scene.updateMatrixWorld();
    this.#camera.updateMatrixWorld();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.#pointer(clientX, clientY), this.#camera);
    return raycaster;
  }

  /** Screen coordinates → normalised device coordinates (−1…1). */
  #pointer(clientX: number, clientY: number): THREE.Vector2 {
    const rect = this.#renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  /** A press becomes a pick (on release) or a long press (after LONG_PRESS_MS, touch and pen only). */
  readonly #onPointerDown = (event: PointerEvent): void => {
    this.#cancelPress();
    // A second finger means pinch or two-finger pan, never a pick.
    if (!event.isPrimary) return;
    const timer =
      event.pointerType === 'mouse'
        ? undefined
        : window.setTimeout(() => {
            if (!this.#press) return;
            this.#press.longPressed = true;
            this.#pick(event, true);
          }, LONG_PRESS_MS);
    this.#press = { event, timer, longPressed: false };
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    if (this.#press && this.#movedTooFar(this.#press.event, event)) this.#cancelPress();
  };

  readonly #onPointerUp = (event: PointerEvent): void => {
    const press = this.#press;
    this.#cancelPress();
    if (!press || press.longPressed || this.#movedTooFar(press.event, event)) return;
    this.#pick(event, false);
  };

  readonly #cancelPress = (): void => {
    window.clearTimeout(this.#press?.timer);
    this.#press = undefined;
  };

  #movedTooFar(from: PointerEvent, to: PointerEvent): boolean {
    const tolerance =
      from.pointerType === 'mouse' ? TAP_TOLERANCE_PX.mouse : TAP_TOLERANCE_PX.other;
    return Math.hypot(to.clientX - from.clientX, to.clientY - from.clientY) > tolerance;
  }

  #pick(event: PointerEvent, longPress: boolean): void {
    const raycaster = this.#raycasterAt(event.clientX, event.clientY);
    // Nearest hit that belongs to a fixture; outlines and other helpers are skipped.
    const hits = raycaster.intersectObject(this.#luminaires.group, true);
    const luminaireId =
      hits.map((hit) => this.#luminaires.luminaireIdOf(hit.object)).find(Boolean) ?? null;
    this.#pickListeners.forEach((listener) => listener({ luminaireId, event, longPress }));
  }
}

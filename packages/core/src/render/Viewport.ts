import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { constrainPosition, defaultPosition, mountSurfaceHit, roomSurfaceHit } from '../placement';
import type { Simulator } from '../simulator';
import { findItem } from '../scene-items';
import type { FloorPoint, PickTarget, Scene, Vec3 } from '../types';
import {
  indirectIlluminance,
  MIN_FILL_LUX,
  toneMappingExposure,
  viewPose,
  type ViewName,
} from './lighting';
import { FixtureModels } from './FixtureModels';
import { FurnitureMeshes } from './FurnitureMeshes';
import { IesLight, IesLightNode } from './IesLight';
import { LuminaireMeshes } from './LuminaireMeshes';
import { Manipulator, type HandleMode, type MoveStartEvent } from './Manipulator';
import { PointerGestures } from './PointerGestures';
import { itemIdOf } from './overlay';
import { RoomMeshes, type RenderMode } from './RoomMeshes';

const VIEW_TRANSITION_MS = 450;
/** Weight of each new frame in the smoothed frame time: about a second's memory at 60 fps. */
const FRAME_SMOOTHING = 0.05;
/** A click this close to a fixture on screen still picks it: thin fixtures, fingers. In px. */
const PICK_SLOP_PX = 10;
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

/** What a Viewport is created with. */
export interface ViewportOptions {
  /** The scene to draw, and where edits from dragging go. */
  readonly simulator: Simulator;
  /** Element the canvas is added to. The viewport fills it and follows its size. */
  readonly container: HTMLElement;
}

/** A distance shown while moving luminaires, and where to label it (ADR 0042). */
export interface Measurement {
  readonly lengthM: number;
  /** The label's place, the dimension's midpoint, in CSS px from the container's top left. */
  readonly x: number;
  readonly y: number;
}

/** How the viewport is doing, e.g. for a debug overlay. Read with `Viewport.diagnostics()`. */
export interface Diagnostics {
  readonly backend: 'WebGPU' | 'WebGL 2';
  /** Frames per second, smoothed over the last second or so. */
  readonly fps: number;
  readonly luminaires: number;
  /** Lights casting shadows, at most the shadow budget. */
  readonly shadowCasters: number;
  /** Draw calls in the last frame, shadow passes included. */
  readonly drawCalls: number;
  /** Triangles drawn in the last frame, shadow passes included. */
  readonly triangles: number;
}

/** A click in the viewport. */
export interface PickEvent {
  /** The luminaire or piece of furniture clicked, or null for neither. */
  readonly target: PickTarget | null;
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
 * viewport.onPick(({ target }) => viewport.setHighlighted(target ? [target.id] : []));
 * ```
 *
 * The viewport has no selection of its own: it reports picks and highlights
 * whatever the host asks for. Dragging a luminaire moves it along the surface
 * it's mounted on, and a piece of furniture over the floor (a picture over
 * the walls), one undo step per drag. If it is highlighted, the other
 * highlighted items move with it. `onMoveStart` reports the start, e.g. for
 * the host to select what is being moved (ADRs 0038, 0047).
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
  readonly #models: FixtureModels;
  readonly #furniture = new FurnitureMeshes();
  // Uniform stand-in for inter-reflections (SPEC §6).
  readonly #bounce = new THREE.HemisphereLight(0xffffff, 0xffffff, 0);
  readonly #pickListeners = new Set<(pick: PickEvent) => void>();
  readonly #measureListeners = new Set<(measurements: readonly Measurement[]) => void>();
  /** What was last reported to measure listeners, to report only changes. */
  #lastMeasurements = '[]';
  readonly #resizeObserver = new ResizeObserver(() => this.#resize());
  #unsubscribe: (() => void) | undefined;
  #unsubscribePhotometry: (() => void) | undefined;
  #unsubscribeModels: (() => void) | undefined;
  #renderMode: RenderMode = 'realistic';
  #exposureEv = 0;
  #highlighted: readonly string[] = [];
  readonly #manipulator: Manipulator;
  #transition: ((now: number) => void) | undefined;
  /** Smoothed time between frames, in ms; 0 until two frames have been drawn. */
  #frameMs = 0;
  #lastFrame: number | undefined;
  #gestures: PointerGestures | undefined;
  #captures: PendingCapture[] = [];
  #started = false;

  constructor({ simulator, container }: ViewportOptions) {
    this.#simulator = simulator;
    this.#container = container;
    // A parsed model swaps placeholders for the real thing on the next sync.
    this.#models = new FixtureModels(
      () => this.#sync(this.#simulator.scene, undefined),
      simulator.logger,
    );
    this.#luminaires = new LuminaireMeshes({
      catalog: simulator.catalog,
      photometry: (productId) => simulator.photometry(productId),
      model: (productId) => this.#models.get(productId, simulator.model(productId)),
      logger: simulator.logger,
    });
    // three.js picks each light's shader by its class; teach it ours.
    this.#renderer.library.addLight(IesLightNode, IesLight);
    this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
    this.#controls.enableDamping = true;
    this.#controls.maxPolarAngle = Math.PI * 0.495; // Stay above the floor.
    this.#controls.maxDistance = 40;
    this.#manipulator = new Manipulator({
      simulator,
      camera: this.#camera,
      raycasterAt: (x, y) => this.#raycasterAt(x, y),
      itemAt: (x, y) => this.#itemAt(x, y),
      furnitureHeightAt: (x, y) => this.#furnitureHit(x, y)?.point.y ?? 0,
      viewportHeightPx: () => this.#container.clientHeight,
    });
    const manipulator = this.#manipulator.group;
    this.#scene.add(
      this.#room.group,
      this.#luminaires.group,
      this.#furniture.group,
      manipulator,
      this.#bounce,
    );
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
    this.#gestures = new PointerGestures(canvas, this.#container, this.#controls, {
      targetAt: (x, y) => this.#manipulator.targetAt(x, y),
      hover: (target) => this.#manipulator.hover(target),
      pick: (event, longPress) => this.#pick(event, longPress),
      startDrag: (target, press, move) => this.#manipulator.startDrag(target, press, move),
    });
    this.#container.append(canvas);
    this.#resizeObserver.observe(this.#container);
    this.#resize();

    this.#unsubscribe = this.#simulator.subscribe((scene, previous) => this.#sync(scene, previous));
    // Fixtures are rebuilt from a product's photometry once its file arrives.
    this.#unsubscribePhotometry = this.#simulator.onPhotometry(() =>
      this.#sync(this.#simulator.scene, undefined),
    );
    // A model file that arrives is parsed on the next sync, then swapped in.
    this.#unsubscribeModels = this.#simulator.onModel(() =>
      this.#sync(this.#simulator.scene, undefined),
    );
    this.#sync(this.#simulator.scene, undefined);
    this.setView('perspective', { animate: false });

    this.#simulator.logger.info(`[render] Drawing with ${this.backend}`);
    await renderer.setAnimationLoop((now) => {
      this.#measureFrame(now);
      this.#transition?.(now);
      this.#controls.update();
      this.#manipulator.updateSizes();
      this.#reportMeasurements();
      if (this.#captures.length > 0) this.#renderCaptures();
      else renderer.render(this.#scene, this.#camera);
    });
    this.#started = true;
  }

  /** Frame rate, lights, shadows and draw calls right now. Meaningful after init(). */
  diagnostics(): Diagnostics {
    const { drawCalls, triangles } = this.#renderer.info.render;
    return {
      backend: this.backend,
      fps: this.#frameMs > 0 ? 1000 / this.#frameMs : 0,
      luminaires: this.#simulator.scene.luminaires.length,
      shadowCasters: this.#luminaires.shadowCasters,
      drawCalls,
      triangles,
    };
  }

  /** Which backend three.js picked. Available after init(). */
  get backend(): 'WebGPU' | 'WebGL 2' {
    return (this.#renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend
      ? 'WebGPU'
      : 'WebGL 2';
  }

  /** How surfaces are drawn: `realistic` colours, or neutral `clay` that shows light only. */
  get renderMode(): RenderMode {
    return this.#renderMode;
  }

  /** Switches the render mode and redraws. */
  set renderMode(mode: RenderMode) {
    this.#renderMode = mode;
    this.#sync(this.#simulator.scene, undefined);
  }

  /** User exposure in EV stops; 0 is the calibrated default. */
  get exposureEv(): number {
    return this.#exposureEv;
  }

  /** Sets the user exposure, in EV stops. */
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

  /** Centres the camera on the given luminaires and furniture, keeping the current viewing direction. */
  frame(ids: readonly string[]): void {
    const positions = ids.flatMap((id): Vec3[] => {
      const found = findItem(this.#simulator.scene, id);
      if (!found) return [];
      const { position } = found.item;
      // A piece's middle, not its footprint on the floor (pictures already are).
      const onFloor = found.kind === 'furniture' && position.y === 0;
      return [onFloor ? { ...position, y: found.item.size.height / 2 } : position];
    });
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
   * Where a product dropped at a screen point goes, as the floor point to pass
   * to `Simulator.addLuminaire` as `at`: below where the pointer meets the surface the
   * product mounts on, so it lands under the pointer. Null when the pointer
   * misses that surface (e.g. above the horizon) or the product is unknown.
   */
  dropPoint(productId: string, clientX: number, clientY: number): FloorPoint | null {
    const product = this.#simulator.catalog.get(productId);
    if (!product) return null;
    const { room } = this.#simulator.scene;
    const ray = this.#raycasterAt(clientX, clientY).ray;
    const hit = mountSurfaceHit(ray, product, defaultPosition(product, room), room);
    if (!hit) return null;
    const { x, z } = constrainPosition(hit, product, room);
    return { x, z };
  }

  /**
   * Where a piece of furniture dropped at a screen point goes, as the floor
   * point to pass to `Simulator.addFurniture` as `at`: under the pointer on the floor,
   * or below where it meets a wall. Null when it misses the room.
   */
  furnitureDropPoint(clientX: number, clientY: number): FloorPoint | null {
    const ray = this.#raycasterAt(clientX, clientY).ray;
    const hit = roomSurfaceHit(ray, this.#simulator.scene.room);
    return hit && { x: hit.x, z: hit.z };
  }

  /** Outlines these luminaires and pieces of furniture (e.g. the host's selection). */
  setHighlighted(ids: readonly string[]): void {
    this.#highlighted = ids;
    this.#luminaires.sync(this.#simulator.scene, ids, this.#renderMode);
    this.#furniture.sync(this.#simulator.scene, ids, this.#renderMode);
    this.#manipulator.setHighlighted(ids);
  }

  /**
   * The handle shown on the highlighted luminaires. `'move'` shows arrows for
   * the axes they can slide along (ADR 0039). `'aim'` shows the aim point and
   * rotation ring, for a single recessed or track luminaire (ADR 0040).
   * Default `'none'`.
   */
  get handle(): HandleMode {
    return this.#manipulator.mode;
  }

  /** Switches the handle shown on the highlighted luminaires. */
  set handle(mode: HandleMode) {
    this.#manipulator.mode = mode;
  }

  /**
   * Whether drags snap: to a 10 cm grid from the room centre, into line with
   * other luminaires and the centre lines, and pan in 15° steps (ADR 0041).
   * Holding Alt during a drag moves freely. Default true.
   */
  get snapping(): boolean {
    return this.#manipulator.snapping;
  }

  /** Switches snapping for the next drags. */
  set snapping(on: boolean) {
    this.#manipulator.snapping = on;
  }

  /**
   * Calls `listener` with the distances to the walls and floor while
   * luminaires are moved, as they change, and with an empty list when the
   * move ends. The viewport draws the lines; labelling them is up to the
   * host, e.g. in its own number format. Returns an unsubscribe function.
   */
  onMeasure(listener: (measurements: readonly Measurement[]) => void): () => void {
    this.#measureListeners.add(listener);
    return () => this.#measureListeners.delete(listener);
  }

  /** Calls `listener` on every click in the viewport. Returns an unsubscribe function. */
  onPick(listener: (pick: PickEvent) => void): () => void {
    this.#pickListeners.add(listener);
    return () => this.#pickListeners.delete(listener);
  }

  /** Calls `listener` when dragging a luminaire or piece of furniture starts. Returns an unsubscribe function. */
  onMoveStart(listener: (start: MoveStartEvent) => void): () => void {
    return this.#manipulator.onMoveStart(listener);
  }

  /** Stops drawing and frees GPU resources. The canvas is removed from the container. */
  dispose(): void {
    // Both return promises only to wait for init(), which has already happened.
    void this.#renderer.setAnimationLoop(null);
    this.#gestures?.dispose();
    for (const { reject } of this.#captures) reject(new Error('Viewport disposed'));
    this.#captures = [];
    this.#unsubscribe?.();
    this.#unsubscribePhotometry?.();
    this.#unsubscribeModels?.();
    this.#resizeObserver.disconnect();
    this.#controls.dispose();
    this.#room.dispose();
    this.#luminaires.dispose();
    this.#furniture.dispose();
    this.#models.dispose();
    this.#manipulator.dispose();
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
    this.#furniture.setOutlinesVisible(false);
    this.#manipulator.group.visible = false;
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
    this.#furniture.setOutlinesVisible(true);
    this.#manipulator.group.visible = true;
  }

  #sync(scene: Scene, previous: Scene | undefined): void {
    if (scene.room !== previous?.room) this.#room.update(scene.room, this.#renderMode);
    this.#luminaires.sync(scene, this.#highlighted, this.#renderMode);
    this.#furniture.sync(scene, this.#highlighted, this.#renderMode);
    this.#bounce.intensity =
      indirectIlluminance(this.#luminaires.totalFlux(), scene.room) + MIN_FILL_LUX;
    this.#renderer.toneMappingExposure = toneMappingExposure(this.#exposureEv);
    this.#manipulator.refresh();
  }

  /** Projects the dimensions' midpoints to the screen and reports them if anything changed. */
  #reportMeasurements(): void {
    const { clientWidth: width, clientHeight: height } = this.#container;
    const measurements: Measurement[] = [];
    for (const { from, to, lengthM } of this.#manipulator.dimensions) {
      const middle = new THREE.Vector3(
        (from.x + to.x) / 2,
        (from.y + to.y) / 2,
        (from.z + to.z) / 2,
      ).project(this.#camera);
      if (middle.z > 1) continue; // Behind the camera.
      measurements.push({
        lengthM,
        x: Math.round(((middle.x + 1) / 2) * width),
        y: Math.round(((1 - middle.y) / 2) * height),
      });
    }
    const serialized = JSON.stringify(measurements);
    if (serialized === this.#lastMeasurements) return;
    this.#lastMeasurements = serialized;
    this.#measureListeners.forEach((listener) => listener(measurements));
  }

  /** Updates the smoothed frame time with the frame starting at `now` (ms). */
  #measureFrame(now: number): void {
    if (this.#lastFrame !== undefined) {
      const ms = now - this.#lastFrame;
      this.#frameMs =
        this.#frameMs === 0 ? ms : this.#frameMs + (ms - this.#frameMs) * FRAME_SMOOTHING;
    }
    this.#lastFrame = now;
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

  #pick(event: PointerEvent, longPress: boolean): void {
    const target = this.#itemAt(event.clientX, event.clientY);
    this.#pickListeners.forEach((listener) => listener({ target, event, longPress }));
  }

  /**
   * The luminaire or piece under a screen point. Luminaires come first, even
   * a little off them or behind a piece: they're small, often over furniture
   * (a pendant over a table), and what the tool is about. Pieces can also be
   * picked from the scene list.
   */
  #itemAt(clientX: number, clientY: number): PickTarget | null {
    const luminaireId = this.#luminaireAt(clientX, clientY);
    if (luminaireId) return { kind: 'luminaire', id: luminaireId };
    const hit = this.#furnitureHit(clientX, clientY);
    const furnitureId = hit && itemIdOf(hit.object);
    return furnitureId ? { kind: 'furniture', id: furnitureId } : null;
  }

  /** Where the ray through a screen point first meets furniture, if it does. */
  #furnitureHit(clientX: number, clientY: number): THREE.Intersection | undefined {
    const raycaster = this.#raycasterAt(clientX, clientY);
    return raycaster.intersectObject(this.#furniture.group, true)[0];
  }

  /**
   * The fixture under a screen point: the one the ray hits first (outlines
   * and other helpers skipped), else the nearest within PICK_SLOP_PX.
   */
  #luminaireAt(clientX: number, clientY: number): string | null {
    const raycaster = this.#raycasterAt(clientX, clientY);
    const hits = raycaster.intersectObject(this.#luminaires.group, true);
    const hit = hits.map((h) => itemIdOf(h.object)).find(Boolean);
    if (hit) return hit;
    const rect = this.#renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(clientX - rect.left, clientY - rect.top);
    const size = new THREE.Vector2(rect.width, rect.height);
    return this.#luminaires.nearestOnScreen(this.#camera, pointer, size, PICK_SLOP_PX) ?? null;
  }
}

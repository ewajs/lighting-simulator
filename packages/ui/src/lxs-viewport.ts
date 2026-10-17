import {
  Viewport,
  type Diagnostics,
  type FloorPoint,
  type FurnitureKind,
  type HandleMode,
  type Measurement,
  type MoveStartEvent,
  type PickEvent,
  type IlluminanceAnalysis,
  type RenderMode,
  type Simulator,
  type ViewName,
} from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { formatFixed } from './format';
import { PRODUCT_DRAG_TYPE } from './lxs-catalog-panel';
import { FURNITURE_DRAG_TYPE } from './lxs-furniture-list';

/** How often the diagnostics overlay refreshes, in ms. */
const STATS_INTERVAL_MS = 500;
/** Loading shorter than this feels instant, so no spinner is shown for it, in ms. */
const LOADER_DELAY_MS = 250;

/**
 * The 3D viewport: wraps core's Viewport (ADR 0019). It highlights what it is
 * given and reports clicks as `lxs-pick` events; it keeps no selection itself.
 * While luminaires are moved it labels their distances to the walls (ADR 0042).
 * Furniture is picked, dragged and dropped like luminaires (ADR 0047).
 * With `diagnostics`, it shows frame rate, backend and draw counts (ADR 0044).
 * The scene stays hidden until its IES files, models and textures are in, and
 * a spinner shows whenever loading takes longer than feels instant (ADR 0054).
 *
 * @fires lxs-ready - the scene is first shown, or the renderer couldn't start
 * @fires lxs-pick - `detail` is core's PickEvent: `{ target, event, longPress }`.
 * @fires lxs-move-start - dragging a luminaire or piece started; `detail` is core's
 *   MoveStartEvent: `{ target, event }`. The drag itself edits the Simulator.
 * @fires lxs-drop-product - a catalog card was dropped: `detail: { productId, at }`.
 * @fires lxs-drop-furniture - a furniture card was dropped: `detail: { kind, at }`.
 * @fires lxs-drop-file - a file was dropped, e.g. a scene file: `detail: { file }`.
 */
@customElement('lxs-viewport')
@localized()
export class LxsViewport extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      background: var(--lxs-viewport-bg);
    }
    .canvas {
      position: absolute;
      inset: 0;
      transition: opacity 200ms ease-out;
    }
    .canvas.hidden {
      opacity: 0;
      transition: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .canvas {
        transition: none;
      }
    }
    .loader {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: var(--lxs-sp-3);
      color: var(--lxs-text-muted);
      font: var(--lxs-fs-sm) var(--lxs-font-ui);
      pointer-events: none;
    }
    .pill {
      position: absolute;
      left: 50%;
      bottom: calc(var(--lxs-sp-3) + var(--lxs-stage-inset-bottom, 0px));
      display: flex;
      align-items: center;
      gap: var(--lxs-sp-2);
      padding: var(--lxs-sp-1) var(--lxs-sp-3);
      border-radius: 999px;
      background: var(--lxs-overlay);
      color: var(--lxs-text-muted);
      font: var(--lxs-fs-xs) var(--lxs-font-ui);
      transform: translateX(-50%);
      pointer-events: none;
      animation: fade-in var(--lxs-t-med) var(--lxs-ease);
    }
    .loader {
      animation: fade-in var(--lxs-t-med) var(--lxs-ease);
    }
    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }
    .spinner {
      width: 22px;
      height: 22px;
      border: 2px solid var(--lxs-line-strong);
      border-top-color: var(--lxs-accent);
      border-radius: 50%;
      animation: spin 800ms linear infinite;
    }
    .pill .spinner {
      width: 12px;
      height: 12px;
    }
    @keyframes spin {
      to {
        transform: rotate(1turn);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation: none;
      }
    }
    .measure {
      position: absolute;
      transform: translate(-50%, -50%);
      padding: 2px 6px;
      border-radius: var(--lxs-r-sm);
      background: var(--lxs-overlay);
      color: var(--lxs-text);
      font: 600 var(--lxs-fs-xs) var(--lxs-font-ui);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      pointer-events: none;
    }
    .diagnostics {
      position: absolute;
      left: var(--lxs-sp-3);
      bottom: calc(var(--lxs-sp-3) + var(--lxs-stage-inset-bottom, 0px));
      display: grid;
      gap: 2px;
      padding: var(--lxs-sp-2) var(--lxs-sp-3);
      border-radius: var(--lxs-r-md);
      background: var(--lxs-overlay);
      color: var(--lxs-text-muted);
      font: var(--lxs-fs-xs) var(--lxs-font-mono);
      pointer-events: none;
    }
    .diagnostics strong {
      color: var(--lxs-text);
    }
    .error {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      color: var(--lxs-text-muted);
      font: var(--lxs-fs-md) var(--lxs-font-ui);
    }
  `;

  @property({ attribute: false }) simulator: Simulator | undefined;
  /** Luminaire and furniture ids to outline. */
  @property({ attribute: false }) highlighted: readonly string[] = [];
  @property({ attribute: 'render-mode' }) renderMode: RenderMode = 'realistic';
  /** Exposure in EV stops; 0 is the calibrated default. */
  @property({ type: Number, attribute: 'exposure-ev' }) exposureEv = 0;
  /** The calculated light the `illuminance` render mode draws (ADR 0066). */
  @property({ attribute: false }) illuminance: IlluminanceAnalysis | undefined;
  /** Handle on the highlighted luminaires: `move` shows arrows to slide them along an axis. */
  @property() handle: HandleMode = 'none';
  /** Shows frame rate, backend, shadows and draw counts over the viewport, for debugging. */
  @property({ type: Boolean }) diagnostics = false;
  /** Whether drags snap to the grid and line up with other luminaires (ADR 0041). */
  @property({ attribute: false }) snapping = true;

  @state() private failed = false;
  @state() private measurements: readonly Measurement[] = [];
  @state() private stats: Diagnostics | undefined;
  /** The scene is hidden: at start-up, or after `cover()`, until nothing is loading. */
  @state() private covered = true;
  /** Something has been loading for longer than LOADER_DELAY_MS. */
  @state() private slow = false;
  #slowTimer: number | undefined;
  #readyFired = false;
  #statsTimer: number | undefined;
  #viewport: Viewport | undefined;

  override render() {
    return this.failed
      ? html`<p class="error">${msg('This browser cannot start WebGPU or WebGL 2.')}</p>`
      : html`<div
            class="canvas ${this.covered ? 'hidden' : ''}"
            @dragover=${this.#onDragOver}
            @drop=${this.#onDrop}
          ></div>
          ${this.#renderLoading()}
          ${this.diagnostics && this.stats ? this.#renderStats(this.stats) : ''}
          ${this.measurements.map(
            ({ lengthM, x, y }) =>
              html`<span class="measure" style="left: ${x}px; top: ${y}px"
                >${formatFixed(lengthM, 2)} m</span
              >`,
          )}`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('simulator')) void this.#mount();
    if (changed.has('diagnostics')) this.#watchStats(this.diagnostics);
    this.#applyProperties();
  }

  #renderLoading() {
    if (!this.slow) return '';
    return this.covered
      ? html`<div class="loader" role="status">
          <span class="spinner"></span>${msg('Loading scene…')}
        </div>`
      : html`<div class="pill" role="status"><span class="spinner"></span>${msg('Loading…')}</div>`;
  }

  /**
   * Hides the scene until what it shows has loaded, with a spinner if that
   * takes a while; e.g. right after a whole scene was opened. Does nothing if
   * everything is already in.
   */
  cover(): void {
    if (this.#viewport?.loading) this.covered = true;
  }

  #onLoading = (loading: boolean): void => {
    window.clearTimeout(this.#slowTimer);
    if (loading) {
      this.#slowTimer = window.setTimeout(() => (this.slow = true), LOADER_DELAY_MS);
      return;
    }
    this.slow = false;
    if (!this.covered) return;
    // Shown on the frame after the one drawn with everything in.
    requestAnimationFrame(() => {
      this.covered = false;
      this.#fireReady();
    });
  };

  /** The first time the scene shows, or the renderer fails: the page can drop its own loader. */
  #fireReady(): void {
    if (this.#readyFired) return;
    this.#readyFired = true;
    this.#emit('lxs-ready', {});
  }

  #renderStats({ backend, fps, luminaires, shadowCasters, drawCalls, triangles }: Diagnostics) {
    const thousands = Math.round(triangles / 1000);
    return html`<div class="diagnostics" aria-hidden="true">
      <strong>${backend} · ${msg(str`${Math.round(fps)} fps`)}</strong>
      <span>${msg(str`${luminaires} lights, ${shadowCasters} with shadows`)}</span>
      <span>${msg(str`${drawCalls} draw calls, ${thousands}k triangles`)}</span>
    </div>`;
  }

  /** Reads the viewport's diagnostics twice a second while they're shown. */
  #watchStats(on: boolean): void {
    window.clearInterval(this.#statsTimer);
    this.#statsTimer = undefined;
    this.stats = undefined;
    if (!on) return;
    this.#statsTimer = window.setInterval(() => {
      this.stats = this.#viewport?.diagnostics();
    }, STATS_INTERVAL_MS);
  }

  /** Which backend the renderer uses, once it has started. */
  get backend(): 'WebGPU' | 'WebGL 2' | undefined {
    return this.#viewport?.backend;
  }

  /** Moves the camera to a preset view. No-op until the renderer has started. */
  setView(view: ViewName): void {
    this.#viewport?.setView(view);
  }

  /**
   * A PNG of the scene as shown, without selection outlines, on the
   * viewport's background colour (--lxs-viewport-bg).
   */
  screenshot(): Promise<Blob> {
    if (!this.#viewport) return Promise.reject(new Error('The viewport has not started'));
    const background = getComputedStyle(this).getPropertyValue('--lxs-viewport-bg').trim();
    return this.#viewport.screenshot(background ? { background } : {});
  }

  /** Centres the camera on these luminaires or pieces of furniture. */
  frame(ids: readonly string[]): void {
    this.#viewport?.frame(ids);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#watchStats(false);
    window.clearTimeout(this.#slowTimer);
    this.#unmount();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Re-attached after a move in the DOM: start again.
    if (this.hasUpdated && !this.#viewport) void this.#mount();
    if (this.hasUpdated && this.diagnostics) this.#watchStats(true);
  }

  async #mount(): Promise<void> {
    this.#unmount();
    const container = this.renderRoot.querySelector<HTMLElement>('.canvas');
    if (!this.simulator || !container) return;
    const viewport = new Viewport({ simulator: this.simulator, container });
    this.#viewport = viewport;
    viewport.onPick((pick) => this.#emit('lxs-pick', pick));
    viewport.onMoveStart((start) => this.#emit('lxs-move-start', start));
    viewport.onMeasure((measurements) => (this.measurements = measurements));
    viewport.onLoadingChange(this.#onLoading);
    try {
      await viewport.init();
    } catch (error) {
      this.simulator.logger.error('[render] The renderer could not start', error);
      this.failed = true;
      this.#fireReady();
      return;
    }
    // Unmounted or replaced while starting up.
    if (this.#viewport !== viewport) viewport.dispose();
    else {
      this.#applyProperties();
      // Nothing to wait for, or still loading: either way, where things stand now.
      this.#onLoading(viewport.loading);
    }
  }

  #unmount(): void {
    this.#viewport?.dispose();
    this.#viewport = undefined;
  }

  #applyProperties(): void {
    if (!this.#viewport) return;
    this.#viewport.setHighlighted(this.highlighted);
    this.#viewport.renderMode = this.renderMode;
    this.#viewport.illuminance = this.illuminance;
    this.#viewport.exposureEv = this.exposureEv;
    this.#viewport.handle = this.handle;
    this.#viewport.snapping = this.snapping;
  }

  #onDragOver = (event: DragEvent): void => {
    const transfer = event.dataTransfer;
    const types = transfer?.types ?? [];
    const accepted = [PRODUCT_DRAG_TYPE, FURNITURE_DRAG_TYPE, 'Files'];
    if (!transfer || !accepted.some((type) => types.includes(type))) return;
    event.preventDefault(); // Allows the drop.
    transfer.dropEffect = 'copy';
  };

  #onDrop = (event: DragEvent): void => {
    const [file] = event.dataTransfer?.files ?? [];
    if (file) {
      event.preventDefault(); // Otherwise the browser opens the file itself.
      return this.#emit<DropFileDetail>('lxs-drop-file', { file });
    }
    const kind = event.dataTransfer?.getData(FURNITURE_DRAG_TYPE) as FurnitureKind | undefined;
    if (kind) return this.#onDropFurniture(event, kind);
    const productId = event.dataTransfer?.getData(PRODUCT_DRAG_TYPE);
    const at = productId && this.#viewport?.dropPoint(productId, event.clientX, event.clientY);
    if (!productId || !at) return;
    event.preventDefault();
    this.dispatchEvent(
      new CustomEvent<DropProductDetail>('lxs-drop-product', {
        detail: { productId, at },
        bubbles: true,
        composed: true,
      }),
    );
  };

  #onDropFurniture(event: DragEvent, kind: FurnitureKind): void {
    const at = this.#viewport?.furnitureDropPoint(event.clientX, event.clientY);
    if (!at) return;
    event.preventDefault();
    this.#emit<DropFurnitureDetail>('lxs-drop-furniture', { kind, at });
  }

  #emit<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true, composed: true }));
  }
}

/** Detail of `lxs-drop-product`: which product, and where on the floor it was dropped. */
export interface DropProductDetail {
  readonly productId: string;
  readonly at: FloorPoint;
}

/** Detail of `lxs-drop-file`: the file dropped on the viewport. */
export interface DropFileDetail {
  readonly file: File;
}

/** Detail of `lxs-drop-furniture`: which piece, and where on the floor it was dropped. */
export interface DropFurnitureDetail {
  readonly kind: FurnitureKind;
  readonly at: FloorPoint;
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-viewport': LxsViewport;
  }
  interface HTMLElementEventMap {
    'lxs-pick': CustomEvent<PickEvent>;
    'lxs-ready': CustomEvent<object>;
    'lxs-move-start': CustomEvent<MoveStartEvent>;
    'lxs-drop-product': CustomEvent<DropProductDetail>;
    'lxs-drop-furniture': CustomEvent<DropFurnitureDetail>;
    'lxs-drop-file': CustomEvent<DropFileDetail>;
  }
}

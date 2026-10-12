import {
  Viewport,
  type Diagnostics,
  type FloorPoint,
  type HandleMode,
  type Measurement,
  type MoveStartEvent,
  type PickEvent,
  type RenderMode,
  type Simulator,
  type ViewName,
} from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { formatFixed } from './format';
import { PRODUCT_DRAG_TYPE } from './lxs-catalog-panel';

/**
 * The 3D viewport: wraps core's Viewport (ADR 0019). It highlights what it is
 * given and reports clicks as `lxs-pick` events; it keeps no selection itself.
 * While luminaires are moved it labels their distances to the walls (ADR 0042).
 * With `diagnostics`, it shows frame rate, backend and draw counts (ADR 0044).
 *
 * @fires lxs-pick - `detail` is core's PickEvent: `{ luminaireId, event }`.
 * @fires lxs-move-start - dragging a luminaire started; `detail` is core's
 *   MoveStartEvent: `{ luminaireId, event }`. The drag itself edits the Simulator.
 * @fires lxs-drop-product - a catalog card was dropped: `detail: { productId, at }`.
 */
/** How often the diagnostics overlay refreshes, in ms. */
const STATS_INTERVAL_MS = 500;

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
  /** Luminaire ids to outline. */
  @property({ attribute: false }) highlighted: readonly string[] = [];
  @property({ attribute: 'render-mode' }) renderMode: RenderMode = 'realistic';
  /** Exposure in EV stops; 0 is the calibrated default. */
  @property({ type: Number, attribute: 'exposure-ev' }) exposureEv = 0;
  /** Handle on the highlighted luminaires: `move` shows arrows to slide them along an axis. */
  @property() handle: HandleMode = 'none';
  /** Shows frame rate, backend, shadows and draw counts over the viewport, for debugging. */
  @property({ type: Boolean }) diagnostics = false;
  /** Whether drags snap to the grid and line up with other luminaires (ADR 0041). */
  @property({ attribute: false }) snapping = true;

  @state() private failed = false;
  @state() private measurements: readonly Measurement[] = [];
  @state() private stats: Diagnostics | undefined;
  #statsTimer: number | undefined;
  #viewport: Viewport | undefined;

  override render() {
    return this.failed
      ? html`<p class="error">${msg('This browser cannot start WebGPU or WebGL 2.')}</p>`
      : html`<div class="canvas" @dragover=${this.#onDragOver} @drop=${this.#onDrop}></div>
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

  /** Centres the camera on these luminaires. */
  frame(ids: readonly string[]): void {
    this.#viewport?.frame(ids);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#watchStats(false);
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
    try {
      await viewport.init();
    } catch (error) {
      this.simulator.logger.error('[render] The renderer could not start', error);
      this.failed = true;
      return;
    }
    // Unmounted or replaced while starting up.
    if (this.#viewport !== viewport) viewport.dispose();
    else this.#applyProperties();
  }

  #unmount(): void {
    this.#viewport?.dispose();
    this.#viewport = undefined;
  }

  #applyProperties(): void {
    if (!this.#viewport) return;
    this.#viewport.setHighlighted(this.highlighted);
    this.#viewport.renderMode = this.renderMode;
    this.#viewport.exposureEv = this.exposureEv;
    this.#viewport.handle = this.handle;
    this.#viewport.snapping = this.snapping;
  }

  #onDragOver = (event: DragEvent): void => {
    if (!event.dataTransfer?.types.includes(PRODUCT_DRAG_TYPE)) return;
    event.preventDefault(); // Allows the drop.
    event.dataTransfer.dropEffect = 'copy';
  };

  #onDrop = (event: DragEvent): void => {
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

  #emit<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true, composed: true }));
  }
}

/** Detail of `lxs-drop-product`: which product, and where on the floor it was dropped. */
export interface DropProductDetail {
  readonly productId: string;
  readonly at: FloorPoint;
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-viewport': LxsViewport;
  }
  interface HTMLElementEventMap {
    'lxs-pick': CustomEvent<PickEvent>;
    'lxs-move-start': CustomEvent<MoveStartEvent>;
    'lxs-drop-product': CustomEvent<DropProductDetail>;
  }
}

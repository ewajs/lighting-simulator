import {
  Viewport,
  type FloorPoint,
  type HandleMode,
  type MoveStartEvent,
  type PickEvent,
  type RenderMode,
  type Simulator,
  type ViewName,
} from '@luxstudio/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { PRODUCT_DRAG_TYPE } from './lxs-catalog-panel';

/**
 * The 3D viewport: wraps core's Viewport (ADR 0019). It highlights what it is
 * given and reports clicks as `lxs-pick` events; it keeps no selection itself.
 *
 * @fires lxs-pick - `detail` is core's PickEvent: `{ luminaireId, event }`.
 * @fires lxs-move-start - dragging a luminaire started; `detail` is core's
 *   MoveStartEvent: `{ luminaireId, event }`. The drag itself edits the Simulator.
 * @fires lxs-drop-product - a catalog card was dropped: `detail: { productId, at }`.
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

  @state() private failed = false;
  #viewport: Viewport | undefined;

  override render() {
    return this.failed
      ? html`<p class="error">${msg('This browser cannot start WebGPU or WebGL 2.')}</p>`
      : html`<div class="canvas" @dragover=${this.#onDragOver} @drop=${this.#onDrop}></div>`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('simulator')) void this.#mount();
    this.#applyProperties();
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
    this.#unmount();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Re-attached after a move in the DOM: start again.
    if (this.hasUpdated && !this.#viewport) void this.#mount();
  }

  async #mount(): Promise<void> {
    this.#unmount();
    const container = this.renderRoot.querySelector<HTMLElement>('.canvas');
    if (!this.simulator || !container) return;
    const viewport = new Viewport({ simulator: this.simulator, container });
    this.#viewport = viewport;
    viewport.onPick((pick) => this.#emit('lxs-pick', pick));
    viewport.onMoveStart((start) => this.#emit('lxs-move-start', start));
    try {
      await viewport.init();
    } catch (error) {
      console.error(error);
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

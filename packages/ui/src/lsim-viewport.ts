import { Viewport, type PickEvent, type RenderMode, type Simulator } from '@lighting-sim/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * The 3D viewport: wraps core's Viewport (ADR 0019). It highlights what it is
 * given and reports clicks as `lsim-pick` events; it keeps no selection itself.
 *
 * @fires lsim-pick - `detail` is core's PickEvent: `{ luminaireId, event }`.
 */
@customElement('lsim-viewport')
@localized()
export class LsimViewport extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      background: var(--lsim-viewport-bg);
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
      color: var(--lsim-text-muted);
      font: var(--lsim-fs-md) var(--lsim-font-ui);
    }
  `;

  @property({ attribute: false }) simulator: Simulator | undefined;
  /** Luminaire ids to outline. */
  @property({ attribute: false }) highlighted: readonly string[] = [];
  @property({ attribute: 'render-mode' }) renderMode: RenderMode = 'realistic';
  /** Exposure in EV stops; 0 is the calibrated default. */
  @property({ type: Number, attribute: 'exposure-ev' }) exposureEv = 0;

  @state() private failed = false;
  #viewport: Viewport | undefined;

  override render() {
    return this.failed
      ? html`<p class="error">${msg('This browser cannot start WebGPU or WebGL 2.')}</p>`
      : html`<div class="canvas"></div>`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('simulator')) void this.#mount();
    this.#applyProperties();
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
    viewport.onPick((pick) => this.#emitPick(pick));
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
  }

  #emitPick(pick: PickEvent): void {
    this.dispatchEvent(
      new CustomEvent<PickEvent>('lsim-pick', { detail: pick, bubbles: true, composed: true }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lsim-viewport': LsimViewport;
  }
  interface HTMLElementEventMap {
    'lsim-pick': CustomEvent<PickEvent>;
  }
}

import type { RenderMode, ViewName } from '@lighting-sim/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Scan } from 'lucide';
import type { FieldChange } from './field-change';
import { formatFixed } from './format';
import { icon } from './icons';
import './lsim-slider-field';
import { segmentedStyles, sharedStyles } from './styles';

/** Exposure range offered, in EV stops. */
const EXPOSURE_RANGE = { min: -3, max: 3, step: 0.1 };

/**
 * Floating controls over the viewport: render mode, preset views, framing and
 * exposure. Pure UI: reports choices as events for the host to apply.
 *
 * @fires lsim-render-mode-change - `detail: { mode }`
 * @fires lsim-view-request - `detail: { view }`
 * @fires lsim-frame-request
 * @fires lsim-exposure-change - `detail: { ev }`
 */
@customElement('lsim-viewport-controls')
@localized()
export class LsimViewportControls extends LitElement {
  static override styles = [
    sharedStyles,
    segmentedStyles,
    css`
      :host {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .glass {
        position: absolute;
        pointer-events: auto;
        background: var(--lsim-overlay);
        -webkit-backdrop-filter: blur(12px);
        backdrop-filter: blur(12px);
        border: 1px solid var(--lsim-line);
        border-radius: var(--lsim-r-lg);
        box-shadow: var(--lsim-shadow);
      }
      .modes {
        top: var(--lsim-sp-3);
        left: 50%;
        transform: translateX(-50%);
        padding: 3px;
      }
      .modes .segmented {
        border: 0;
        background: transparent;
      }
      .views {
        top: var(--lsim-sp-3);
        right: var(--lsim-sp-3);
        display: grid;
        gap: 2px;
        padding: 3px;
      }
      .views button {
        width: 56px;
        height: 28px;
        border: 0;
        border-radius: var(--lsim-r-sm);
        background: transparent;
        color: var(--lsim-text-muted);
        font-size: var(--lsim-fs-xs);
        font-weight: 600;
        cursor: pointer;
      }
      .views button:hover {
        background: var(--lsim-surface-3);
        color: var(--lsim-text);
      }
      .views button[aria-pressed='true'] {
        background: var(--lsim-accent-soft);
        color: var(--lsim-accent);
      }
      .views .frame {
        display: grid;
        place-items: center;
        border-top: 1px solid var(--lsim-line);
        border-radius: 0 0 var(--lsim-r-sm) var(--lsim-r-sm);
      }
      .exposure {
        right: var(--lsim-sp-3);
        bottom: var(--lsim-sp-3);
        width: 180px;
        padding: var(--lsim-sp-2) var(--lsim-sp-3);
      }
    `,
  ];

  @property() renderMode: RenderMode = 'realistic';
  @property({ attribute: false }) view: ViewName = 'perspective';
  @property({ type: Number }) exposureEv = 0;

  override render() {
    const views: [ViewName, string][] = [
      ['perspective', msg('3D')],
      ['top', msg('Plan')],
      ['front', msg('Front')],
      ['side', msg('Side')],
    ];
    const modes: [RenderMode, string][] = [
      ['realistic', msg('Realistic')],
      ['clay', msg('Clay')],
    ];
    return html`
      <div class="glass modes">
        <div class="segmented" role="radiogroup" aria-label=${msg('Render mode')}>
          ${modes.map(
            ([mode, label]) =>
              html`<button
                type="button"
                role="radio"
                aria-checked=${this.renderMode === mode}
                @click=${() => this.#emit('lsim-render-mode-change', { mode })}
              >
                ${label}
              </button>`,
          )}
          <button
            type="button"
            role="radio"
            aria-checked="false"
            disabled
            title=${msg('Coming soon')}
          >
            ${msg('Illuminance')}
          </button>
        </div>
      </div>
      <div class="glass views" role="group" aria-label=${msg('Camera views')}>
        ${views.map(
          ([view, label]) =>
            html`<button
              type="button"
              aria-pressed=${this.view === view}
              @click=${() => this.#emit('lsim-view-request', { view })}
            >
              ${label}
            </button>`,
        )}
        <button
          class="frame"
          type="button"
          aria-label=${msg('Frame selection')}
          title=${msg('Frame selection')}
          @click=${() => this.#emit('lsim-frame-request', {})}
        >
          ${icon(Scan)}
        </button>
      </div>
      <div
        class="glass exposure"
        title=${msg('Double-click to reset')}
        @dblclick=${() => this.#emit('lsim-exposure-change', { ev: 0 })}
      >
        <lsim-slider-field
          label=${msg('Exposure')}
          .value=${this.exposureEv}
          .min=${EXPOSURE_RANGE.min}
          .max=${EXPOSURE_RANGE.max}
          .step=${EXPOSURE_RANGE.step}
          .format=${(ev: number) => `${ev > 0 ? '+' : ''}${formatFixed(ev, 1)} EV`}
          @lsim-change=${({ detail }: CustomEvent<FieldChange>) => this.#emit('lsim-exposure-change', { ev: detail.value })}
        ></lsim-slider-field>
      </div>
    `;
  }

  #emit(type: string, detail: object): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lsim-viewport-controls': LsimViewportControls;
  }
  interface HTMLElementEventMap {
    'lsim-render-mode-change': CustomEvent<{ mode: RenderMode }>;
    'lsim-view-request': CustomEvent<{ view: ViewName }>;
    'lsim-frame-request': CustomEvent<object>;
    'lsim-exposure-change': CustomEvent<{ ev: number }>;
  }
}

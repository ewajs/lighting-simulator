import type { RenderMode, ViewName } from '@luxstudio/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Scan } from 'lucide';
import type { FieldChange } from './field-change';
import { formatFixed } from './format';
import { icon } from './icons';
import './lxs-slider-field';
import { segmentedStyles, sharedStyles } from './styles';

/** Exposure range offered, in EV stops. */
const EXPOSURE_RANGE = { min: -3, max: 3, step: 0.1 };

/**
 * Floating controls over the viewport: render mode, preset views, framing and
 * exposure. Pure UI: reports choices as events for the host to apply.
 *
 * @fires lxs-render-mode-change - `detail: { mode }`
 * @fires lxs-view-request - `detail: { view }`
 * @fires lxs-frame-request
 * @fires lxs-exposure-change - `detail: { ev }`
 */
@customElement('lxs-viewport-controls')
@localized()
export class LxsViewportControls extends LitElement {
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
        background: var(--lxs-overlay);
        -webkit-backdrop-filter: blur(12px);
        backdrop-filter: blur(12px);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-lg);
        box-shadow: var(--lxs-shadow);
      }
      .modes {
        top: var(--lxs-sp-3);
        left: 50%;
        transform: translateX(-50%);
        padding: 3px;
      }
      .modes .segmented {
        border: 0;
        background: transparent;
      }
      .views {
        top: var(--lxs-sp-3);
        right: var(--lxs-sp-3);
        display: grid;
        gap: 2px;
        padding: 3px;
      }
      .views button {
        width: 56px;
        /* A little taller than segmented buttons with a mouse; touch-sized on touch screens. */
        height: max(28px, var(--lxs-segment-h));
        border: 0;
        border-radius: var(--lxs-r-sm);
        background: transparent;
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-xs);
        font-weight: 600;
        cursor: pointer;
      }
      .views button:hover {
        background: var(--lxs-surface-3);
        color: var(--lxs-text);
      }
      .views button[aria-pressed='true'] {
        background: var(--lxs-accent-soft);
        color: var(--lxs-accent);
      }
      .views .frame {
        display: grid;
        place-items: center;
        border-top: 1px solid var(--lxs-line);
        border-radius: 0 0 var(--lxs-r-sm) var(--lxs-r-sm);
      }
      .exposure {
        right: var(--lxs-sp-3);
        /* --lxs-stage-inset-bottom: space taken by a sheet floating over the viewport. */
        bottom: calc(var(--lxs-sp-3) + var(--lxs-stage-inset-bottom, 0px));
        width: 180px;
        padding: var(--lxs-sp-2) var(--lxs-sp-3);
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
                @click=${() => this.#emit('lxs-render-mode-change', { mode })}
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
              @click=${() => this.#emit('lxs-view-request', { view })}
            >
              ${label}
            </button>`,
        )}
        <button
          class="frame"
          type="button"
          aria-label=${msg('Frame selection')}
          title=${msg('Frame selection')}
          @click=${() => this.#emit('lxs-frame-request', {})}
        >
          ${icon(Scan)}
        </button>
      </div>
      <div
        class="glass exposure"
        title=${msg('Double-click to reset')}
        @dblclick=${() => this.#emit('lxs-exposure-change', { ev: 0 })}
      >
        <lxs-slider-field
          label=${msg('Exposure')}
          .value=${this.exposureEv}
          .min=${EXPOSURE_RANGE.min}
          .max=${EXPOSURE_RANGE.max}
          .step=${EXPOSURE_RANGE.step}
          .format=${(ev: number) => `${ev > 0 ? '+' : ''}${formatFixed(ev, 1)} EV`}
          @lxs-change=${({ detail }: CustomEvent<FieldChange>) => this.#emit('lxs-exposure-change', { ev: detail.value })}
        ></lxs-slider-field>
      </div>
    `;
  }

  #emit(type: string, detail: object): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-viewport-controls': LxsViewportControls;
  }
  interface HTMLElementEventMap {
    'lxs-render-mode-change': CustomEvent<{ mode: RenderMode }>;
    'lxs-view-request': CustomEvent<{ view: ViewName }>;
    'lxs-frame-request': CustomEvent<object>;
    'lxs-exposure-change': CustomEvent<{ ev: number }>;
  }
}

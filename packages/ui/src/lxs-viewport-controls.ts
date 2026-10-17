import type { RenderMode, ViewName } from '@luxstudio/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Crosshair, Magnet, Move, Scan } from 'lucide';
import type { FieldChange } from './field-change';
import { formatFixed } from './format';
import { icon } from './icons';
import './lxs-illuminance-legend';
import './lxs-slider-field';
import type { EditTool } from './shortcuts';
import { segmentedStyles, sharedStyles } from './styles';

/** Exposure range offered, in EV stops. */
const EXPOSURE_RANGE = { min: -3, max: 3, step: 0.1 };

/**
 * Edit tool, render mode, preset views, framing and exposure. As an `overlay` (default)
 * they float over the viewport; as a `panel` they stack in normal flow, e.g.
 * inside a phone sheet. Pure UI: reports choices as events for the host to apply.
 *
 * @fires lxs-tool-change - `detail: { tool }`: move or aim handle
 * @fires lxs-snapping-change - `detail: { snapping }`
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
      .tools {
        top: var(--lxs-sp-3);
        left: var(--lxs-sp-3);
        display: grid;
        gap: 2px;
        padding: 3px;
      }
      /* A column in the overlay, clear of the render modes at the top centre. */
      .tools .segmented {
        display: grid;
        padding: 0;
        border: 0;
        background: transparent;
      }
      .tools button {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
      }
      .snap {
        height: var(--lxs-segment-h);
        padding: 0 var(--lxs-sp-3);
        border: 0;
        border-top: 1px solid var(--lxs-line);
        border-radius: 0 0 var(--lxs-r-sm) var(--lxs-r-sm);
        background: transparent;
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-sm);
        font-weight: 500;
        cursor: pointer;
      }
      .snap:hover {
        color: var(--lxs-text);
      }
      .snap[aria-pressed='true'] {
        color: var(--lxs-accent);
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
      :host([variant='panel']) {
        position: static;
        display: grid;
        align-content: start;
        gap: var(--lxs-sp-4);
        padding: var(--lxs-sp-4);
        pointer-events: auto;
      }
      :host([variant='panel']) .glass {
        position: static;
        width: auto;
        padding: 0;
        transform: none;
        background: transparent;
        border: 0;
        box-shadow: none;
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
      }
      :host([variant='panel']) .views {
        display: flex;
      }
      :host([variant='panel']) .tools,
      :host([variant='panel']) .tools .segmented {
        display: flex;
      }
      :host([variant='panel']) .tools button {
        width: auto;
      }
      :host([variant='panel']) .snap {
        border-top: 0;
        border-left: 1px solid var(--lxs-line);
        border-radius: 0 var(--lxs-r-sm) var(--lxs-r-sm) 0;
      }
      :host([variant='panel']) .views button {
        flex: 1;
        width: auto;
      }
      :host([variant='panel']) .views .frame {
        border-top: 0;
      }
      .exposure,
      .legend {
        right: var(--lxs-sp-3);
        /* --lxs-stage-inset-bottom: space taken by a sheet floating over the viewport. */
        bottom: calc(var(--lxs-sp-3) + var(--lxs-stage-inset-bottom, 0px));
        width: 180px;
        padding: var(--lxs-sp-2) var(--lxs-sp-3);
      }
      .legend {
        width: auto;
        min-width: 110px;
        height: 220px;
        grid-template-rows: auto 1fr auto;
      }
    `,
  ];

  @property({ reflect: true }) variant: 'overlay' | 'panel' = 'overlay';
  @property() tool: EditTool = 'move';
  @property({ type: Boolean }) snapping = true;
  @property() renderMode: RenderMode = 'realistic';
  @property({ attribute: false }) view: ViewName = 'perspective';
  @property({ type: Number }) exposureEv = 0;
  /** In the illuminance mode, how current the map is: shown under its legend. */
  @property({ attribute: 'legend-note' }) legendNote = '';

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
      ['illuminance', msg('Illuminance')],
    ];
    const tools: [EditTool, string, typeof Move, string][] = [
      ['move', msg('Move'), Move, 'W'],
      [
        'aim',
        msg('Aim', { id: 'tool-aim', desc: 'Edit tool that aims a luminaire' }),
        Crosshair,
        'E',
      ],
    ];
    return html`
      <div class="glass tools">
        <div class="segmented" role="radiogroup" aria-label=${msg('Edit tool')}>
          ${tools.map(
            ([tool, label, glyph, key]) =>
              html`<button
                type="button"
                role="radio"
                aria-checked=${this.tool === tool}
                title=${`${label} (${key})`}
                @click=${() => this.#emit('lxs-tool-change', { tool })}
              >
                ${icon(glyph)} ${label}
              </button>`,
          )}
        </div>
        <button
          class="snap"
          type="button"
          aria-pressed=${this.snapping}
          aria-label=${msg('Snapping')}
          title=${msg('Snapping (hold Alt to move freely)')}
          @click=${() => this.#emit('lxs-snapping-change', { snapping: !this.snapping })}
        >
          ${icon(Magnet)} ${msg('Magnet')}
        </button>
      </div>
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
      ${
        this.renderMode === 'illuminance'
          ? html`<lxs-illuminance-legend
              class="glass legend"
              note=${this.legendNote}
            ></lxs-illuminance-legend>`
          : this.#exposure()
      }
    `;
  }

  #exposure() {
    return html`<div
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
    </div>`;
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
    'lxs-tool-change': CustomEvent<{ tool: EditTool }>;
    'lxs-snapping-change': CustomEvent<{ snapping: boolean }>;
    'lxs-render-mode-change': CustomEvent<{ mode: RenderMode }>;
    'lxs-view-request': CustomEvent<{ view: ViewName }>;
    'lxs-frame-request': CustomEvent<object>;
    'lxs-exposure-change': CustomEvent<{ ev: number }>;
  }
}

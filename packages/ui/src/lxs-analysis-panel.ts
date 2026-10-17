import type {
  AnalysisSettings,
  CalculationOptions,
  IlluminanceAnalysis,
  SurfaceResult,
} from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LoaderCircle, TriangleAlert } from 'lucide';
import type { FieldChange } from './field-change';
import { formatNumber } from './format';
import { icon } from './icons';
import { surfaceLabel } from './labels';
import './lxs-number-field';
import { inspectorStyles, sharedStyles } from './styles';

/** Where the app's calculation stands (ADR 0064). */
export interface AnalysisState {
  /** The last finished calculation, kept on screen while the next one runs. */
  readonly analysis: IlluminanceAnalysis | undefined;
  /** How long it took, in ms. */
  readonly ms: number | undefined;
  /** Why the last calculation failed, if it did. */
  readonly error: string | undefined;
  readonly calculating: boolean;
  /** Whether the scene or the settings changed since `analysis`. */
  readonly stale: boolean;
}

/** Nothing calculated yet. */
export const NO_ANALYSIS: AnalysisState = {
  analysis: undefined,
  ms: undefined,
  error: undefined,
  calculating: false,
  stale: true,
};

/** The maintenance factor's range in the field: below 0.5 an installation is neglected, and 1 is new. */
const MAINTENANCE_RANGE = { min: 0.5, max: 1, step: 0.05 };
/** Steps for the work plane's height and border, in m. */
const LENGTH_STEP_M = 0.05;

/**
 * The illuminance calculation's results and settings (ADR 0064): the work
 * plane's figures first, every surface's below, and what the calculation
 * counts. It shows the state it's given; the host runs the calculation.
 *
 * @fires lxs-analysis-settings - `detail: AnalysisSettings`
 * @fires lxs-calculation-options - `detail: CalculationOptions`
 * @fires lxs-auto-calculate - `detail: { auto }`
 * @fires lxs-calculate - the Calculate button
 * @fires lxs-open-catalog - from the empty state's button
 */
@customElement('lxs-analysis-panel')
@localized()
export class LxsAnalysisPanel extends LitElement {
  static override styles = [
    sharedStyles,
    inspectorStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow-y: auto;
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .spin {
        display: inline-flex;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .spin {
          animation: none;
        }
      }
      .run {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--lxs-sp-2);
      }
      .btn.primary {
        border-color: var(--lxs-accent);
        background: var(--lxs-accent);
        color: var(--lxs-on-accent);
      }
      .btn.primary:hover {
        background: var(--lxs-accent-hover);
      }
      .hero {
        display: grid;
        gap: var(--lxs-sp-2);
      }
      .big {
        font: 600 28px / 1.1 var(--lxs-font-mono);
      }
      .big small,
      .figure small {
        margin-left: 3px;
        color: var(--lxs-text-muted);
        font: var(--lxs-fs-sm) var(--lxs-font-ui);
      }
      .figures {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--lxs-sp-2);
      }
      .figure {
        padding: var(--lxs-sp-2);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-md);
        background: var(--lxs-surface-2);
      }
      .figure-label {
        color: var(--lxs-text-faint);
        font-size: var(--lxs-fs-xs);
      }
      .figure-value {
        font: var(--lxs-fs-md) var(--lxs-font-mono);
      }
      h3 .unit {
        text-transform: none;
      }
      .faded {
        opacity: 0.55;
        transition: opacity var(--lxs-t-fast);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--lxs-fs-sm);
      }
      th {
        color: var(--lxs-text-faint);
        font-size: var(--lxs-fs-xs);
        font-weight: 400;
        text-align: right;
      }
      th:first-child,
      td:first-child {
        text-align: left;
      }
      th,
      td {
        padding-left: var(--lxs-sp-3);
        white-space: nowrap;
      }
      th:first-child,
      td:first-child {
        padding-left: 0;
      }
      td {
        padding-top: 3px;
        padding-bottom: 3px;
        color: var(--lxs-text-muted);
        text-align: right;
        font-family: var(--lxs-font-mono);
      }
      td:first-child {
        color: var(--lxs-text);
        font-family: var(--lxs-font-ui);
      }
      .notes {
        display: grid;
        gap: var(--lxs-sp-1);
        font-size: var(--lxs-fs-sm);
      }
      .notes p {
        display: flex;
        gap: var(--lxs-sp-2);
        margin: 0;
      }
      .notes .icon {
        margin-top: 2px;
      }
      .error {
        color: var(--lxs-danger);
      }
      /* A switch: a checkbox drawn as a sliding knob (DESIGN.md). */
      .switch {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--lxs-sp-3);
        font-size: var(--lxs-fs-sm);
        cursor: pointer;
      }
      .switch input {
        appearance: none;
        flex: none;
        position: relative;
        width: 34px;
        height: 20px;
        margin: 0;
        border-radius: 10px;
        background: var(--lxs-surface-3);
        border: 1px solid var(--lxs-line-strong);
        cursor: pointer;
        transition: background var(--lxs-t-fast);
      }
      .switch input::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--lxs-text-muted);
        transition:
          transform var(--lxs-t-fast),
          background var(--lxs-t-fast);
      }
      .switch input:checked {
        background: var(--lxs-accent);
        border-color: var(--lxs-accent);
      }
      .switch input:checked::after {
        transform: translateX(14px);
        background: var(--lxs-on-accent);
      }
      .switch input:disabled,
      .switch:has(input:disabled) {
        opacity: 0.4;
        cursor: default;
      }
      .switch-text small {
        display: block;
        color: var(--lxs-text-faint);
        font-size: var(--lxs-fs-xs);
      }
    `,
  ];

  @property({ attribute: false }) state: AnalysisState = NO_ANALYSIS;
  @property({ attribute: false }) settings: AnalysisSettings | undefined;
  @property({ attribute: false }) options: CalculationOptions | undefined;
  /** Recalculate as the scene changes, or only on Calculate. */
  @property({ type: Boolean }) auto = true;
  /** The room's height, in m: the work plane must stay below it. */
  @property({ type: Number }) roomHeight = 2.7;
  /** Whether the scene has any luminaires to calculate. */
  @property({ type: Boolean }) empty = false;

  override render() {
    return html`
      <div class="panel-header" part="header">
        <h2>${msg('Analysis')}</h2>
      </div>
      ${this.empty ? this.#empty() : this.#results()} ${this.#settings()}
    `;
  }

  #status() {
    const { state } = this;
    if (state.calculating) {
      return html`<span class="status"
        ><span class="spin">${icon(LoaderCircle)}</span>${msg('Calculating…')}</span
      >`;
    }
    if (state.error) return msg('Calculation failed');
    if (state.analysis && state.ms !== undefined) {
      return state.stale
        ? msg('Out of date')
        : msg(str`Calculated in ${formatNumber(state.ms)} ms`);
    }
    return '';
  }

  #empty() {
    return html`<div class="empty">
      <p>${msg('Add luminaires to see how much light reaches each surface.')}</p>
      <button class="btn" type="button" @click=${() => this.#fire('lxs-open-catalog')}>
        ${msg('Open the catalog')}
      </button>
    </div>`;
  }

  #results() {
    const { state } = this;
    const analysis = state.analysis;
    const workPlane = analysis?.surfaces.find((s) => s.grid.surface === 'work-plane');
    const faded = state.stale || state.calculating;
    return html`
      <section>
        <div class="run">
          ${this.#switch(msg('Calculate as I edit'), this.auto, (auto) =>
            this.#fire('lxs-auto-calculate', { auto }),
          )}
          ${
            this.auto
              ? nothing
              : html`<button
                  class="btn primary"
                  type="button"
                  @click=${() => this.#fire('lxs-calculate')}
                >
                  ${msg('Calculate')}
                </button>`
          }
        </div>
        <span class="meta" role="status">${this.#status()}</span>
        ${state.error ? html`<p class="error">${state.error}</p>` : nothing}
      </section>
      ${analysis ? html`<div class=${faded ? 'faded' : ''}>${this.#workPlane(workPlane)}${this.#surfaces(analysis)}${this.#notes(analysis)}</div>` : nothing}
    `;
  }

  #workPlane(surface: SurfaceResult | undefined) {
    const stats = surface?.stats;
    const height = this.settings?.workPlaneHeightM ?? 0;
    const border = this.settings?.borderM ?? 0;
    return html`<section class="hero">
      <h3>${msg('Work plane')}</h3>
      ${
        stats
          ? html`<div class="big" title=${msg('Average maintained illuminance')}>
                ${formatNumber(stats.averageLx)}<small>lx Ē</small>
              </div>
              <div class="meta">
                ${msg(
                  str`${formatNumber(height, 2)} m high, leaving out a ${formatNumber(border, 2)} m border`,
                )}
              </div>
              <div class="figures">
                ${this.#figure('Emin', formatNumber(stats.minLx), 'lx')}
                ${this.#figure('Emax', formatNumber(stats.maxLx), 'lx')}
                ${this.#figure('U₀', formatNumber(stats.uniformity, 2), '')}
              </div>`
          : html`<p class="meta">${msg('The border leaves no work plane to measure.')}</p>`
      }
    </section>`;
  }

  #figure(label: string, value: string, unit: string) {
    return html`<div class="figure">
      <div class="figure-label">${label}</div>
      <div class="figure-value">${value}${unit ? html`<small>${unit}</small>` : nothing}</div>
    </div>`;
  }

  #surfaces(analysis: IlluminanceAnalysis) {
    const rows = analysis.surfaces.filter((s) => s.grid.surface !== 'work-plane' && s.stats);
    return html`<section>
      <h3>${msg('Room surfaces')} <span class="unit">(lx)</span></h3>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Ē</th>
            <th>Emin</th>
            <th>U₀</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(
            (s) =>
              html`<tr>
                <td>${surfaceLabel(s.grid.surface)}</td>
                <td>${formatNumber(s.stats!.averageLx)}</td>
                <td>${formatNumber(s.stats!.minLx)}</td>
                <td>${formatNumber(s.stats!.uniformity, 2)}</td>
              </tr>`,
          )}
        </tbody>
      </table>
    </section>`;
  }

  #notes(analysis: IlluminanceAnalysis) {
    const estimated = analysis.estimatedLuminaires.length;
    const unknown = analysis.unknownLuminaires.length;
    const factor = formatNumber(analysis.settings.maintenanceFactor, 2);
    return html`<section class="notes">
      <p class="meta">${msg(str`Maintained values: with a maintenance factor of ${factor}.`)}</p>
      ${
        estimated > 0
          ? html`<p class="warn">
              ${icon(TriangleAlert)}
              ${msg(str`Without an IES file: ${estimated}. Their light is an estimate.`)}
            </p>`
          : nothing
      }
      ${
        unknown > 0
          ? html`<p class="warn">
              ${icon(TriangleAlert)} ${msg(str`Not in the catalog, left out: ${unknown}.`)}
            </p>`
          : nothing
      }
    </section>`;
  }

  #settings() {
    const settings = this.settings;
    const options = this.options;
    if (!settings || !options) return nothing;
    const setSettings = (change: Partial<AnalysisSettings>) =>
      this.#fire('lxs-analysis-settings', { ...settings, ...change });
    const setOptions = (change: Partial<CalculationOptions>) =>
      this.#fire('lxs-calculation-options', { ...options, ...change });
    return html`<section>
      <h3>${msg('Calculation settings')}</h3>
      <lxs-number-field
        label=${msg('Maintenance factor')}
        .value=${settings.maintenanceFactor}
        .min=${MAINTENANCE_RANGE.min}
        .max=${MAINTENANCE_RANGE.max}
        .step=${MAINTENANCE_RANGE.step}
        .decimals=${2}
        @lxs-change=${({ detail }: CustomEvent<FieldChange>) =>
          setSettings({ maintenanceFactor: detail.value })}
      ></lxs-number-field>
      <lxs-number-field
        label=${msg('Work plane height')}
        unit="m"
        .value=${settings.workPlaneHeightM}
        .min=${0}
        .max=${this.roomHeight}
        .step=${LENGTH_STEP_M}
        @lxs-change=${({ detail }: CustomEvent<FieldChange>) =>
          setSettings({ workPlaneHeightM: detail.value })}
      ></lxs-number-field>
      <lxs-number-field
        label=${msg('Work plane border')}
        unit="m"
        .value=${settings.borderM}
        .min=${0}
        .max=${2}
        .step=${LENGTH_STEP_M}
        @lxs-change=${({ detail }: CustomEvent<FieldChange>) =>
          setSettings({ borderM: detail.value })}
      ></lxs-number-field>
      ${this.#switch(
        msg('Light that bounces'),
        options.bouncedLight,
        (bouncedLight) =>
          // Furniture in bounced light needs bounced light (ADR 0063): off together.
          setOptions({
            bouncedLight,
            furnitureInBouncedLight: bouncedLight && options.furnitureInBouncedLight,
          }),
        msg('Off: direct light only, faster and a third or more too dark.'),
      )}
      ${this.#switch(
        msg('Furniture in bounced light'),
        options.furnitureInBouncedLight,
        (furnitureInBouncedLight) => setOptions({ furnitureInBouncedLight }),
        msg('Off: faster in furnished rooms, less accurate near furniture.'),
        !options.bouncedLight,
      )}
    </section>`;
  }

  #switch(
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
    hint?: string,
    disabled = false,
  ) {
    return html`<label class="switch">
      <span class="switch-text">${label}${hint ? html`<small>${hint}</small>` : nothing}</span>
      <input
        type="checkbox"
        role="switch"
        .checked=${checked}
        ?disabled=${disabled}
        @change=${(event: Event) => onChange((event.target as HTMLInputElement).checked)}
      />
    </label>`;
  }

  #fire(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementEventMap {
    'lxs-analysis-settings': CustomEvent<AnalysisSettings>;
    'lxs-calculation-options': CustomEvent<CalculationOptions>;
    'lxs-auto-calculate': CustomEvent<{ auto: boolean }>;
    'lxs-calculate': CustomEvent<undefined>;
  }
  interface HTMLElementTagNameMap {
    'lxs-analysis-panel': LxsAnalysisPanel;
  }
}

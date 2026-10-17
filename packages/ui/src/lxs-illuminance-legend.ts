import { FALSE_COLOUR_STOPS } from '@luxstudio/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { formatNumber } from './format';
import { sharedStyles } from './styles';

/**
 * The illuminance view's key (ADR 0066): the false-colour scale from core, a
 * tick at each stop, highest at the top, and a line on how current the map is.
 */
@customElement('lxs-illuminance-legend')
@localized()
export class LxsIlluminanceLegend extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: grid;
        gap: var(--lxs-sp-2);
        font-size: var(--lxs-fs-xs);
      }
      .title {
        color: var(--lxs-text-muted);
      }
      .scale {
        display: grid;
        grid-template-columns: 14px auto;
        gap: var(--lxs-sp-2);
      }
      .bar {
        border-radius: var(--lxs-r-sm);
        border: 1px solid var(--lxs-line);
      }
      .ticks {
        display: flex;
        flex-direction: column-reverse;
        justify-content: space-between;
        font-family: var(--lxs-font-mono);
        line-height: 1;
      }
      .note {
        color: var(--lxs-text-faint);
      }
    `,
  ];

  /** How current the map is, e.g. "Calculating…"; nothing when it is. */
  @property() note = '';

  override render() {
    const stops = FALSE_COLOUR_STOPS;
    const gradient = stops
      .map(({ rgb }, k) => `rgb(${rgb.join(' ')}) ${(k / (stops.length - 1)) * 100}%`)
      .join(', ');
    return html`
      <div class="title">${msg('Illuminance (lx)')}</div>
      <div class="scale" role="img" aria-label=${msg('False-colour scale from 0 to 2000 lx')}>
        <div class="bar" style="background: linear-gradient(to top, ${gradient})"></div>
        <div class="ticks">${stops.map(({ lx }) => html`<span>${formatNumber(lx)}</span>`)}</div>
      </div>
      ${this.note ? html`<div class="note" role="status">${this.note}</div>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-illuminance-legend': LxsIlluminanceLegend;
  }
}

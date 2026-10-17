import type { CalcSurfaceName, PointIlluminance } from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { formatNumber } from './format';
import { surfaceLabel } from './labels';
import { sharedStyles } from './styles';

/** How far the readout sits from the pointer, in px: beside it, not under the finger. */
const OFFSET_PX = 16;
/**
 * The bottom-right corner the illuminance legend takes, in px (with its
 * margin): the readout goes to the pointer's left rather than under it.
 */
const LEGEND_CORNER = { width: 160, height: 260 };

/**
 * The lux probe's readout (ADR 0067): the light at the probed point, total
 * first, then direct and bounced, and the surface it's on. The host places it
 * at `x`, `y` within the viewport; it keeps itself inside `width` × `height`.
 */
@customElement('lxs-probe')
@localized()
export class LxsProbe extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        position: absolute;
        z-index: 2;
        pointer-events: none;
        padding: var(--lxs-sp-2) var(--lxs-sp-3);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-md);
        background: color-mix(in srgb, var(--lxs-surface-1) 88%, transparent);
        backdrop-filter: blur(8px);
        box-shadow: var(--lxs-shadow);
        white-space: nowrap;
      }
      .total {
        font: 600 var(--lxs-fs-lg) var(--lxs-font-mono);
      }
      .total small,
      .parts {
        color: var(--lxs-text-muted);
        font: var(--lxs-fs-xs) var(--lxs-font-ui);
      }
      .surface {
        color: var(--lxs-text-faint);
        font-size: var(--lxs-fs-xs);
      }
    `,
  ];

  @property({ attribute: false }) illuminance: PointIlluminance | undefined;
  @property({ attribute: false }) surface: CalcSurfaceName | undefined;
  /** The pointer, in px from the viewport's top left. */
  @property({ type: Number }) x = 0;
  @property({ type: Number }) y = 0;
  /** The viewport's size, in px, so the readout stays inside it. */
  @property({ type: Number }) width = 0;
  @property({ type: Number }) height = 0;

  override render() {
    const lux = this.illuminance;
    if (!lux) return nothing;
    return html`
      <div class="total">${formatNumber(lux.totalLx)}<small> lx</small></div>
      <div class="parts">
        ${msg(str`Direct ${formatNumber(lux.directLx)} · bounced ${formatNumber(lux.indirectLx)}`)}
      </div>
      ${this.surface ? html`<div class="surface">${surfaceLabel(this.surface)}</div>` : nothing}
    `;
  }

  protected override updated(): void {
    // Beside the pointer, flipped to its other side near the viewport's right or bottom edge.
    const box = this.getBoundingClientRect();
    const right = this.x + OFFSET_PX + box.width;
    const overLegend =
      right > this.width - LEGEND_CORNER.width &&
      this.y + OFFSET_PX + box.height > this.height - LEGEND_CORNER.height;
    const left =
      right > this.width || overLegend ? this.x - OFFSET_PX - box.width : this.x + OFFSET_PX;
    const top =
      this.y + OFFSET_PX + box.height > this.height
        ? this.y - OFFSET_PX - box.height
        : this.y + OFFSET_PX;
    this.style.transform = `translate(${Math.max(0, left)}px, ${Math.max(0, top)}px)`;
    this.style.left = '0';
    this.style.top = '0';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-probe': LxsProbe;
  }
}

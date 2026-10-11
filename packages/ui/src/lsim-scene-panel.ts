import { summarizeScene, type Catalog, type Scene } from '@lighting-sim/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EMPTY_DISPLAY_CATALOG, luminaireNames, type DisplayCatalog } from './display-catalog';
import { formatNumber } from './format';
import { mountIcon } from './icons';
import { sharedStyles } from './styles';

/** Detail of `lsim-select`: a luminaire chosen in a list, with Shift/⌘ held for `toggle`. */
export interface SelectDetail {
  readonly luminaireId: string;
  readonly toggle: boolean;
}

/**
 * Scene totals and the list of luminaires. Rows report clicks; the selection
 * itself is owned by the host (ADR 0019).
 *
 * @fires lsim-select - `detail: SelectDetail`
 * @fires lsim-open-catalog - from the empty state's button
 */
@customElement('lsim-scene-panel')
@localized()
export class LsimScenePanel extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--lsim-sp-2);
        padding: var(--lsim-sp-3);
      }
      .stat {
        padding: var(--lsim-sp-2) var(--lsim-sp-3);
        border: 1px solid var(--lsim-line);
        border-radius: var(--lsim-r-md);
        background: var(--lsim-surface-2);
      }
      .stat-label {
        color: var(--lsim-text-faint);
        font-size: var(--lsim-fs-xs);
      }
      .stat-value {
        font: var(--lsim-fs-lg) var(--lsim-font-mono);
      }
      .stat-value small {
        margin-left: 2px;
        color: var(--lsim-text-muted);
        font-size: var(--lsim-fs-xs);
      }
      .list {
        flex: 1;
        overflow-y: auto;
        padding: 0 var(--lsim-sp-2) var(--lsim-sp-3);
      }
      .row {
        display: flex;
        align-items: center;
        gap: var(--lsim-sp-2);
        width: 100%;
        height: 32px;
        padding: 0 var(--lsim-sp-2) 0 var(--lsim-sp-3);
        border: 0;
        border-radius: var(--lsim-r-sm);
        background: transparent;
        color: var(--lsim-text-muted);
        text-align: left;
        cursor: pointer;
      }
      .row:hover {
        background: var(--lsim-surface-2);
        color: var(--lsim-text);
      }
      .row[aria-selected='true'] {
        background: var(--lsim-accent-soft);
        color: var(--lsim-accent);
      }
      .row-name {
        flex: 1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .row-meta {
        color: var(--lsim-text-faint);
        font: var(--lsim-fs-xs) var(--lsim-font-mono);
      }
      .off .row-name {
        opacity: 0.45;
      }
    `,
  ];

  @property({ attribute: false }) scene: Scene | undefined;
  @property({ attribute: false }) products: Catalog | undefined;
  @property({ attribute: false }) display: DisplayCatalog = EMPTY_DISPLAY_CATALOG;
  @property({ attribute: false }) selection: readonly string[] = [];

  override render() {
    const scene = this.scene;
    const count = scene?.luminaires.length ?? 0;
    return html`
      <div class="panel-header">
        <h2>${msg('Scene')}</h2>
        <span class="meta">${msg(str`${count} luminaires`)}</span>
      </div>
      ${scene && this.products ? this.#stats(scene, this.products) : ''}
      <div class="list" role="listbox" aria-multiselectable="true" aria-label=${msg('Luminaires')}>
        ${scene && count > 0 ? this.#rows(scene) : this.#empty()}
      </div>
    `;
  }

  #stats(scene: Scene, products: Catalog) {
    const { fixtures, power, flux, powerDensity } = summarizeScene(scene, products);
    const stat = (label: string, value: string, unit: string) =>
      html`<div class="stat">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}<small>${unit}</small></div>
      </div>`;
    return html`<div class="stats">
      ${stat(msg('Fixtures'), formatNumber(fixtures), '')}
      ${stat(msg('Power'), formatNumber(power, 1), 'W')}
      ${stat(msg('Flux'), formatNumber(flux), 'lm')}
      ${stat(msg('Density'), formatNumber(powerDensity, 1), 'W/m²')}
    </div>`;
  }

  #rows(scene: Scene) {
    const names = luminaireNames(scene, this.display);
    return scene.luminaires.map((luminaire) => {
      const product = this.products?.get(luminaire.productId);
      return html`<button
        class="row ${luminaire.on ? '' : 'off'}"
        type="button"
        role="option"
        aria-selected=${this.selection.includes(luminaire.id)}
        @click=${(event: MouseEvent) =>
          this.#select(luminaire.id, event.shiftKey || event.metaKey || event.ctrlKey)}
      >
        ${mountIcon(product?.mount)}
        <span class="row-name">${names.get(luminaire.id)}</span>
        <span class="row-meta">
          ${luminaire.on ? `${formatNumber(luminaire.dimming * 100)}%` : msg('off')}
        </span>
      </button>`;
    });
  }

  #empty() {
    return html`<div class="empty">
      <p>${msg('No luminaires yet. Add one from the catalog.')}</p>
      <button
        class="btn"
        type="button"
        @click=${() =>
          this.dispatchEvent(
            new CustomEvent('lsim-open-catalog', { bubbles: true, composed: true }),
          )}
      >
        ${msg('Open catalog')}
      </button>
    </div>`;
  }

  #select(luminaireId: string, toggle: boolean): void {
    this.dispatchEvent(
      new CustomEvent<SelectDetail>('lsim-select', {
        detail: { luminaireId, toggle },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lsim-scene-panel': LsimScenePanel;
  }
  interface HTMLElementEventMap {
    'lsim-select': CustomEvent<SelectDetail>;
    'lsim-open-catalog': CustomEvent<undefined>;
  }
}

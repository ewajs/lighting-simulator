import { summarizeScene, type Catalog, type Scene } from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EMPTY_DISPLAY_CATALOG, luminaireNames, type DisplayCatalog } from './display-catalog';
import { formatNumber } from './format';
import { mountIcon } from './icons';
import { sharedStyles } from './styles';

/** Detail of `lxs-select`: a luminaire chosen in a list, with Shift/⌘ held for `toggle`. */
export interface SelectDetail {
  readonly luminaireId: string;
  readonly toggle: boolean;
}

/**
 * Scene totals and the list of luminaires. Rows report clicks; the selection
 * itself is owned by the host (ADR 0019).
 *
 * @fires lxs-select - `detail: SelectDetail`
 * @fires lxs-open-catalog - from the empty state's button
 */
@customElement('lxs-scene-panel')
@localized()
export class LxsScenePanel extends LitElement {
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
        gap: var(--lxs-sp-2);
        padding: var(--lxs-sp-3);
      }
      .stat {
        padding: var(--lxs-sp-2) var(--lxs-sp-3);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-md);
        background: var(--lxs-surface-2);
      }
      .stat-label {
        color: var(--lxs-text-faint);
        font-size: var(--lxs-fs-xs);
      }
      .stat-value {
        font: var(--lxs-fs-lg) var(--lxs-font-mono);
      }
      .stat-value small {
        margin-left: 2px;
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-xs);
      }
      .list {
        flex: 1;
        overflow-y: auto;
        padding: 0 var(--lxs-sp-2) var(--lxs-sp-3);
      }
      .row {
        display: flex;
        align-items: center;
        gap: var(--lxs-sp-2);
        width: 100%;
        height: 32px;
        padding: 0 var(--lxs-sp-2) 0 var(--lxs-sp-3);
        border: 0;
        border-radius: var(--lxs-r-sm);
        background: transparent;
        color: var(--lxs-text-muted);
        text-align: left;
        cursor: pointer;
      }
      .row:hover {
        background: var(--lxs-surface-2);
        color: var(--lxs-text);
      }
      .row[aria-selected='true'] {
        background: var(--lxs-accent-soft);
        color: var(--lxs-accent);
      }
      .row-name {
        flex: 1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .row-meta {
        color: var(--lxs-text-faint);
        font: var(--lxs-fs-xs) var(--lxs-font-mono);
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
            new CustomEvent('lxs-open-catalog', { bubbles: true, composed: true }),
          )}
      >
        ${msg('Open catalog')}
      </button>
    </div>`;
  }

  #select(luminaireId: string, toggle: boolean): void {
    this.dispatchEvent(
      new CustomEvent<SelectDetail>('lxs-select', {
        detail: { luminaireId, toggle },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-scene-panel': LxsScenePanel;
  }
  interface HTMLElementEventMap {
    'lxs-select': CustomEvent<SelectDetail>;
    'lxs-open-catalog': CustomEvent<undefined>;
  }
}

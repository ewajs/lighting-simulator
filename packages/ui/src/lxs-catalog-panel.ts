import type { Catalog, MountType } from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Plus, Search } from 'lucide';
import {
  catalogFacets,
  EMPTY_DISPLAY_CATALOG,
  filterItems,
  NO_FILTER,
  type CatalogFilter,
  type CatalogItem,
  type DisplayCatalog,
} from './display-catalog';
import { formatKelvin, formatNumber } from './format';
import { mountLabel } from './labels';
import { icon, mountIcon } from './icons';
import { sharedStyles } from './styles';

/** dataTransfer type carrying a productId while a product card is dragged. */
export const PRODUCT_DRAG_TYPE = 'application/x-lxs-product';

/**
 * Browse, search and filter the host's catalog. Clicking a product (or
 * pressing Enter on it) asks to add it; cards can also be dragged into the viewport.
 *
 * @fires lxs-add-product - `detail: { productId }`
 */
@customElement('lxs-catalog-panel')
@localized()
export class LxsCatalogPanel extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .tools {
        display: grid;
        gap: var(--lxs-sp-2);
        padding: var(--lxs-sp-3);
      }
      .search {
        display: flex;
        align-items: center;
        gap: var(--lxs-sp-2);
        height: var(--lxs-control-h);
        padding: 0 var(--lxs-sp-2);
        background: var(--lxs-surface-2);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-md);
        color: var(--lxs-text-faint);
      }
      .search:focus-within {
        border-color: var(--lxs-accent);
      }
      .search input {
        flex: 1;
        min-width: 0;
        border: 0;
        background: transparent;
        outline: none;
        color: var(--lxs-text);
      }
      .selects {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--lxs-sp-2);
      }
      select {
        min-width: 0;
        height: var(--lxs-control-h);
        padding: 0 var(--lxs-sp-2);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-md);
        background: var(--lxs-surface-2);
        color: var(--lxs-text);
        font: inherit;
        font-size: var(--lxs-fs-sm);
        cursor: pointer;
      }
      select:focus-visible {
        border-color: var(--lxs-accent);
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--lxs-sp-1);
      }
      .chip {
        height: 24px;
        padding: 0 var(--lxs-sp-2);
        border: 1px solid var(--lxs-line);
        border-radius: 12px;
        background: transparent;
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-xs);
        cursor: pointer;
      }
      .chip:hover {
        color: var(--lxs-text);
        border-color: var(--lxs-line-strong);
      }
      .chip[aria-pressed='true'] {
        border-color: transparent;
        background: var(--lxs-accent-soft);
        color: var(--lxs-accent);
      }
      .list {
        flex: 1;
        overflow-y: auto;
        padding: 0 var(--lxs-sp-2) var(--lxs-sp-3);
      }
      .card {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--lxs-sp-3);
        width: 100%;
        padding: var(--lxs-sp-2);
        border: 1px solid transparent;
        border-radius: var(--lxs-r-md);
        background: transparent;
        text-align: left;
        cursor: grab;
      }
      .card:hover {
        background: var(--lxs-surface-2);
        border-color: var(--lxs-line);
      }
      .thumb {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        overflow: hidden;
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-md);
        background: var(--lxs-surface-2);
        color: var(--lxs-text-faint);
      }
      .thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .name,
      .spec {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .name {
        font-weight: 600;
        font-size: var(--lxs-fs-sm);
      }
      .spec {
        color: var(--lxs-text-faint);
        font-size: var(--lxs-fs-xs);
      }
      .add {
        opacity: 0;
        color: var(--lxs-text-muted);
      }
      .card:hover .add,
      .card:focus-visible .add {
        opacity: 1;
      }
    `,
  ];

  /** Names, categories and thumbnails from the host. */
  @property({ attribute: false }) display: DisplayCatalog = EMPTY_DISPLAY_CATALOG;
  /** Simulation data, for the spec line on each card. */
  @property({ attribute: false }) products: Catalog | undefined;

  @state() private filter: CatalogFilter = NO_FILTER;

  override render() {
    const empty: Catalog = { get: () => undefined };
    const products = this.products ?? empty;
    const matches = filterItems(this.display.items, this.filter, products);
    const facets = catalogFacets(this.display.items, products);
    return html`
      <div class="panel-header">
        <h2>${msg('Catalog')}</h2>
        <span class="meta">${msg(str`${this.display.items.length} products`)}</span>
      </div>
      <div class="tools">
        <label class="search">
          ${icon(Search)}
          <input
            type="search"
            .value=${this.filter.query}
            placeholder=${msg('Search products')}
            aria-label=${msg('Search products')}
            @input=${(event: Event) => this.#setFilter({ query: (event.target as HTMLInputElement).value })}
          />
        </label>
        <div class="selects">
          <select
            aria-label=${msg('Mount type')}
            @change=${(event: Event) =>
              this.#setFilter({
                mount: ((event.target as HTMLSelectElement).value || null) as MountType | null,
              })}
          >
            <option value="" ?selected=${this.filter.mount === null}>${msg('Mount')}</option>
            ${facets.mounts.map(
              (mount) =>
                html`<option value=${mount} ?selected=${this.filter.mount === mount}>
                  ${mountLabel(mount)}
                </option>`,
            )}
          </select>
          <select
            aria-label=${msg('Colour temperature')}
            @change=${(event: Event) => {
              const value = (event.target as HTMLSelectElement).value;
              this.#setFilter({ cct: value ? Number(value) : null });
            }}
          >
            <option value="" ?selected=${this.filter.cct === null}>${msg('Temperature')}</option>
            ${facets.ccts.map(
              (cct) =>
                html`<option value=${cct} ?selected=${this.filter.cct === cct}>
                  ${formatKelvin(cct)}
                </option>`,
            )}
          </select>
        </div>
        <div class="chips" role="toolbar" aria-label=${msg('Filter by category')}>
          ${this.#chip(null, msg('All'))}
          ${this.display.categories.map((category) => this.#chip(category.id, category.label))}
        </div>
      </div>
      <div class="list">
        ${
          matches.length === 0
            ? html`<p class="empty">${msg('No products match your search.')}</p>`
            : this.display.categories.map((category) => {
                const items = matches.filter((item) => item.categoryId === category.id);
                return items.length === 0
                  ? nothing
                  : html`<div class="group-label">${category.label}</div>
                      ${items.map((item) => this.#card(item))}`;
              })
        }
      </div>
    `;
  }

  #setFilter(change: Partial<CatalogFilter>): void {
    this.filter = { ...this.filter, ...change };
  }

  #chip(categoryId: string | null, label: string) {
    return html`<button
      class="chip"
      type="button"
      aria-pressed=${this.filter.categoryId === categoryId}
      @click=${() => this.#setFilter({ categoryId })}
    >
      ${label}
    </button>`;
  }

  #card(item: CatalogItem) {
    const product = this.products?.get(item.productId);
    const spec = product
      ? `${formatNumber(product.power)} W · ${formatKelvin(product.cct)} · ${formatNumber(product.flux)} lm`
      : '';
    return html`<button
      class="card"
      type="button"
      draggable="true"
      title=${msg('Click to add, or drag into the room')}
      @click=${() => this.#add(item.productId)}
      @dragstart=${(event: DragEvent) => {
        event.dataTransfer?.setData(PRODUCT_DRAG_TYPE, item.productId);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <span class="thumb">
        ${item.thumbnailUrl ? html`<img src=${item.thumbnailUrl} alt="" />` : mountIcon(product?.mount)}
      </span>
      <span style="min-width: 0">
        <div class="name">${item.name}</div>
        <div class="spec">${spec}</div>
      </span>
      <span class="add">${icon(Plus)}</span>
    </button>`;
  }

  #add(productId: string): void {
    this.dispatchEvent(
      new CustomEvent('lxs-add-product', { detail: { productId }, bubbles: true, composed: true }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-catalog-panel': LxsCatalogPanel;
  }
  interface HTMLElementEventMap {
    'lxs-add-product': CustomEvent<{ productId: string }>;
  }
}

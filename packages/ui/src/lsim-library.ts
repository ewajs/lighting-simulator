import type { Catalog, Scene } from '@lighting-sim/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Layers, LayoutGrid } from 'lucide';
import { EMPTY_DISPLAY_CATALOG, type DisplayCatalog } from './display-catalog';
import { icon } from './icons';
import './lsim-catalog-panel';
import './lsim-scene-panel';
import { sharedStyles } from './styles';

type Tab = 'catalog' | 'scene';

/**
 * The left panel: an icon rail switching between the catalog and the scene
 * list. When `collapsed`, only the rail shows. Clicking the active tab asks to
 * collapse; clicking any tab while collapsed asks to expand.
 *
 * @fires lsim-collapse-request - `detail: { collapsed }`
 */
@customElement('lsim-library')
@localized()
export class LsimLibrary extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: grid;
        grid-template-columns: 48px minmax(0, 1fr);
        min-height: 0;
        background: var(--lsim-surface-1);
      }
      nav {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--lsim-sp-1);
        padding: var(--lsim-sp-2) 0;
        border-right: 1px solid var(--lsim-line);
      }
      lsim-catalog-panel,
      lsim-scene-panel {
        min-height: 0;
      }
      :host([collapsed]) {
        grid-template-columns: 48px;
      }
    `,
  ];

  @property({ attribute: false }) display: DisplayCatalog = EMPTY_DISPLAY_CATALOG;
  @property({ attribute: false }) products: Catalog | undefined;
  @property({ attribute: false }) scene: Scene | undefined;
  @property({ attribute: false }) selection: readonly string[] = [];

  @property({ type: Boolean, reflect: true }) collapsed = false;

  @state() private tab: Tab = 'catalog';

  override render() {
    return html`
      <nav role="tablist" aria-orientation="vertical">
        ${this.#tabButton('catalog', msg('Catalog'), icon(LayoutGrid))}
        ${this.#tabButton('scene', msg('Scene'), icon(Layers))}
      </nav>
      ${
        this.collapsed
          ? ''
          : this.tab === 'catalog'
            ? html`<lsim-catalog-panel
                role="tabpanel"
                .display=${this.display}
                .products=${this.products}
              ></lsim-catalog-panel>`
            : html`<lsim-scene-panel
                role="tabpanel"
                .scene=${this.scene}
                .products=${this.products}
                .display=${this.display}
                .selection=${this.selection}
                @lsim-open-catalog=${() => (this.tab = 'catalog')}
              ></lsim-scene-panel>`
      }
    `;
  }

  #onTab(tab: Tab): void {
    const collapse = tab === this.tab && !this.collapsed;
    this.tab = tab;
    if (collapse || this.collapsed) {
      this.dispatchEvent(
        new CustomEvent('lsim-collapse-request', {
          detail: { collapsed: collapse },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  #tabButton(tab: Tab, label: string, content: unknown) {
    return html`<button
      class="icon-btn"
      type="button"
      role="tab"
      aria-selected=${this.tab === tab && !this.collapsed}
      aria-label=${label}
      title=${label}
      @click=${() => this.#onTab(tab)}
    >
      ${content}
    </button>`;
  }
}

declare global {
  interface HTMLElementEventMap {
    'lsim-collapse-request': CustomEvent<{ collapsed: boolean }>;
  }
  interface HTMLElementTagNameMap {
    'lsim-library': LsimLibrary;
  }
}

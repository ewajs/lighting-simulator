import type { Catalog, Scene } from '@luxstudio/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Layers, LayoutGrid } from 'lucide';
import { EMPTY_DISPLAY_CATALOG, type DisplayCatalog } from './display-catalog';
import { icon } from './icons';
import './lxs-catalog-panel';
import './lxs-scene-panel';
import { sharedStyles } from './styles';

type Tab = 'catalog' | 'scene';

/**
 * The left panel: an icon rail switching between the catalog and the scene
 * list. When `collapsed`, only the rail shows; the host narrows the library
 * to the rail's 48 px, and the panel slides out as it does. Clicking the
 * active tab asks to collapse; clicking any tab while collapsed asks to expand.
 *
 * @fires lxs-collapse-request - `detail: { collapsed }`
 */
@customElement('lxs-library')
@localized()
export class LxsLibrary extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: grid;
        grid-template-columns: 48px minmax(0, 1fr);
        min-height: 0;
        background: var(--lxs-surface-1);
        overflow: clip;
      }
      nav {
        /* Above the panel, which slides out underneath it. */
        position: relative;
        z-index: 1;
        background: var(--lxs-surface-1);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--lxs-sp-1);
        padding: var(--lxs-sp-2) 0;
        border-right: 1px solid var(--lxs-line);
      }
      /* The panel keeps its width while the host's column eases shut, so it
         slides out under the rail rather than squeezing, and hides once out
         of sight. The host sizes the library: the rail's width when collapsed.
         The panel draws the library's right edge, so its width is exact. */
      lxs-catalog-panel,
      lxs-scene-panel {
        min-height: 0;
        justify-self: end;
        box-sizing: border-box;
        width: 100%;
        min-width: calc(var(--lxs-panel-w) - 48px);
        border-right: 1px solid var(--lxs-line);
      }
      :host([collapsed]) :is(lxs-catalog-panel, lxs-scene-panel) {
        visibility: hidden;
        transition: visibility 0s var(--lxs-t-panel);
      }
    `,
  ];

  @property({ attribute: false }) display: DisplayCatalog = EMPTY_DISPLAY_CATALOG;
  @property({ attribute: false }) products: Catalog | undefined;
  @property({ attribute: false }) scene: Scene | undefined;
  @property({ attribute: false }) selection: readonly string[] = [];
  /** Passed to the catalog panel: lets the user load their own IES file. */
  @property({ type: Boolean, attribute: 'ies-import' }) iesImport = false;

  @property({ type: Boolean, reflect: true }) collapsed = false;

  @state() private tab: Tab = 'catalog';

  override render() {
    return html`
      <nav role="tablist" aria-orientation="vertical">
        ${this.#tabButton('catalog', msg('Catalog'), icon(LayoutGrid))}
        ${this.#tabButton('scene', msg('Scene'), icon(Layers))}
      </nav>
      ${
        this.tab === 'catalog'
          ? html`<lxs-catalog-panel
              role="tabpanel"
              .display=${this.display}
              .products=${this.products}
              .iesImport=${this.iesImport}
            ></lxs-catalog-panel>`
          : html`<lxs-scene-panel
              role="tabpanel"
              .scene=${this.scene}
              .products=${this.products}
              .display=${this.display}
              .selection=${this.selection}
              @lxs-open-catalog=${() => (this.tab = 'catalog')}
            ></lxs-scene-panel>`
      }
    `;
  }

  #onTab(tab: Tab): void {
    const collapse = tab === this.tab && !this.collapsed;
    this.tab = tab;
    if (collapse || this.collapsed) {
      this.dispatchEvent(
        new CustomEvent('lxs-collapse-request', {
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
    'lxs-collapse-request': CustomEvent<{ collapsed: boolean }>;
  }
  interface HTMLElementTagNameMap {
    'lxs-library': LxsLibrary;
  }
}

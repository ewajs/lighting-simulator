import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { IconNode } from 'lucide';
import { icon } from './icons';
import { sharedStyles } from './styles';

/** One tab in `<lxs-tab-bar>`. */
export interface TabBarItem {
  readonly id: string;
  readonly label: string;
  readonly icon: IconNode;
}

/**
 * The phone navigation bar: icon + label tabs, at the bottom or (`vertical`)
 * as a left rail. Tapping a tab selects it;
 * tapping the active one deselects it (the host closes its sheet).
 *
 * @fires lxs-tab-change - `detail: { tab }`, where `tab` is null when deselected
 */
@customElement('lxs-tab-bar')
export class LxsTabBar extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        background: var(--lxs-surface-1);
        border-top: 1px solid var(--lxs-line);
        /* Clear the home indicator on phones without a home button. */
        padding-bottom: env(safe-area-inset-bottom);
      }
      nav {
        display: flex;
        flex: 1;
      }
      :host([vertical]) {
        border-top: 0;
        border-right: 1px solid var(--lxs-line);
        padding-bottom: 0;
        padding-left: env(safe-area-inset-left);
      }
      :host([vertical]) nav {
        flex-direction: column;
      }
      :host([vertical]) button {
        flex: none;
        width: 72px;
        min-height: 64px;
      }
      button {
        flex: 1;
        display: grid;
        justify-items: center;
        gap: 2px;
        min-height: 56px;
        padding: var(--lxs-sp-2) 0;
        border: 0;
        background: transparent;
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-xs);
        cursor: pointer;
      }
      button[aria-selected='true'] {
        color: var(--lxs-accent);
      }
      .icon {
        width: 20px;
        height: 20px;
      }
    `,
  ];

  @property({ attribute: false }) tabs: readonly TabBarItem[] = [];
  /** A left rail instead of a bottom bar (landscape phones). */
  @property({ type: Boolean, reflect: true }) vertical = false;
  /** Id of the active tab, or null. */
  @property({ attribute: false }) active: string | null = null;

  override render() {
    return html`<nav role="tablist">
      ${this.tabs.map(
        (tab) =>
          html`<button
            type="button"
            role="tab"
            aria-selected=${this.active === tab.id}
            @click=${() =>
              this.dispatchEvent(
                new CustomEvent('lxs-tab-change', {
                  detail: { tab: this.active === tab.id ? null : tab.id },
                  bubbles: true,
                  composed: true,
                }),
              )}
          >
            ${icon(tab.icon)}<span>${tab.label}</span>
          </button>`,
      )}
    </nav>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-tab-bar': LxsTabBar;
  }
  interface HTMLElementEventMap {
    'lxs-tab-change': CustomEvent<{ tab: string | null }>;
  }
}

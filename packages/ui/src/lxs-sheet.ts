import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Maximize2, Minimize2, X } from 'lucide';
import { icon } from './icons';
import { sharedStyles } from './styles';

/**
 * A panel that slides over the viewport on phones: a title bar with
 * half/full-height and close buttons, and the content in its default slot.
 * Its size and position come from the host's layout; `expanded` asks for the
 * full height.
 *
 * @slot - The sheet's content.
 * @fires lxs-sheet-expand - `detail: { expanded }`
 * @fires lxs-sheet-close
 */
@customElement('lxs-sheet')
@localized()
export class LxsSheet extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
        background: var(--lxs-surface-1);
        border-top: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-lg) var(--lxs-r-lg) 0 0;
        box-shadow: var(--lxs-shadow);
        overflow: hidden;
        animation: rise var(--lxs-t-med) var(--lxs-ease);
      }
      :host([side]) {
        animation-name: arrive;
        border-top: 0;
        border-left: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-lg) 0 0 var(--lxs-r-lg);
        padding-right: env(safe-area-inset-right);
      }
      header {
        display: flex;
        align-items: center;
        gap: var(--lxs-sp-1);
        padding: 0 var(--lxs-sp-2) 0 var(--lxs-sp-4);
        border-bottom: 1px solid var(--lxs-line);
      }
      h2 {
        flex: 1;
        margin: 0;
        font-size: var(--lxs-fs-md);
        font-weight: 600;
      }
      .body {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
      }
      ::slotted(*) {
        flex: 1;
        min-height: 0;
      }
      /* A short slide and fade: noticeable, not a whoosh. leave() plays it backwards. */
      :host([leaving]) {
        animation: rise var(--lxs-t-fast) ease-in reverse forwards;
      }
      :host([side][leaving]) {
        animation-name: arrive;
      }
      @keyframes rise {
        from {
          transform: translateY(24px);
          opacity: 0;
        }
      }
      @keyframes arrive {
        from {
          transform: translateX(24px);
          opacity: 0;
        }
      }
    `,
  ];

  /**
   * Slides the sheet out, resolving once it's out of sight, so the host can
   * remove it then. At once with reduced motion.
   */
  async leave(): Promise<void> {
    this.toggleAttribute('leaving', true);
    await Promise.all(this.getAnimations().map((animation) => animation.finished.catch(() => {})));
  }

  /** Shown in the title bar. */
  @property() heading = '';
  @property({ type: Boolean, reflect: true }) expanded = false;
  /** Slides in from the right (landscape phones) instead of up from the bottom. */
  @property({ type: Boolean, reflect: true }) side = false;

  override render() {
    const sizeLabel = this.side
      ? this.expanded
        ? msg('Half width')
        : msg('Full width')
      : this.expanded
        ? msg('Half height')
        : msg('Full height');
    return html`
      <header>
        <h2>${this.heading}</h2>
        <button
          class="icon-btn"
          type="button"
          aria-label=${sizeLabel}
          title=${sizeLabel}
          @click=${() => this.#emit('lxs-sheet-expand', { expanded: !this.expanded })}
        >
          ${icon(this.expanded ? Minimize2 : Maximize2)}
        </button>
        <button
          class="icon-btn"
          type="button"
          aria-label=${msg('Close')}
          title=${msg('Close')}
          @click=${() => this.#emit('lxs-sheet-close', {})}
        >
          ${icon(X)}
        </button>
      </header>
      <div class="body"><slot></slot></div>
    `;
  }

  #emit(type: string, detail: object): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-sheet': LxsSheet;
  }
  interface HTMLElementEventMap {
    'lxs-sheet-expand': CustomEvent<{ expanded: boolean }>;
    'lxs-sheet-close': CustomEvent<object>;
  }
}

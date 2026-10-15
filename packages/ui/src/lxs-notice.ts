import { localized, msg } from '@lit/localize';
import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { X } from 'lucide';
import { icon } from './icons';
import { sharedStyles } from './styles';

/** How long a notice stays before it hides itself, in ms: time to read two lines. */
const NOTICE_MS = 7000;

/** What a notice says, and whether something went wrong. */
export interface Notice {
  readonly text: string;
  readonly kind: 'info' | 'error';
  /** Something to copy by hand, e.g. a link the clipboard refused: shown in a read-only field. */
  readonly copyable?: string;
}

/**
 * A short message over the bottom of the viewport, e.g. what happened when a
 * file was opened. It hides itself after a few seconds, or with its ×.
 * Screen readers announce it.
 *
 * @fires lxs-notice-close - it timed out or the user closed it
 */
@customElement('lxs-notice')
@localized()
export class LxsNotice extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        pointer-events: none;
      }
      .notice {
        display: flex;
        align-items: center;
        gap: var(--lxs-sp-2);
        width: fit-content;
        max-width: 480px;
        padding: var(--lxs-sp-2) var(--lxs-sp-2) var(--lxs-sp-2) var(--lxs-sp-3);
        border: 1px solid var(--lxs-line-strong);
        border-radius: var(--lxs-r-md);
        background: var(--lxs-overlay);
        color: var(--lxs-text);
        font-size: var(--lxs-fs-sm);
        pointer-events: auto;
      }
      .notice[data-kind='error'] {
        border-color: var(--lxs-danger);
      }
      .text {
        display: grid;
        flex: 1;
        gap: var(--lxs-sp-1);
        min-width: 0;
      }
      .copyable {
        width: 100%;
        height: var(--lxs-control-h);
        padding: 0 var(--lxs-sp-2);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-sm);
        background: var(--lxs-surface-2);
        color: var(--lxs-text);
        font: var(--lxs-fs-xs) var(--lxs-font-mono);
      }
    `,
  ];

  /** What to show; null shows nothing. A new notice restarts the timer. */
  @property({ attribute: false }) notice: Notice | null = null;
  #timer: number | undefined;

  override render() {
    // The live region stays in place so a new message is announced.
    return html`<div role="status" aria-live="polite">
      ${
        this.notice
          ? html`<div class="notice" data-kind=${this.notice.kind}>
              <span class="text">
                ${this.notice.text}
                ${
                  this.notice.copyable
                    ? html`<input
                        class="copyable"
                        readonly
                        aria-label=${this.notice.text}
                        .value=${this.notice.copyable}
                        @focus=${(event: FocusEvent) => (event.target as HTMLInputElement).select()}
                      />`
                    : ''
                }
              </span>
              <button
                class="icon-btn"
                type="button"
                aria-label=${msg('Close')}
                title=${msg('Close')}
                @click=${this.#close}
              >
                ${icon(X)}
              </button>
            </div>`
          : ''
      }
    </div>`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has('notice')) return;
    window.clearTimeout(this.#timer);
    if (this.notice) this.#timer = window.setTimeout(this.#close, NOTICE_MS);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this.#timer);
  }

  #close = (): void => {
    window.clearTimeout(this.#timer);
    this.dispatchEvent(new CustomEvent('lxs-notice-close', { bubbles: true, composed: true }));
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-notice': LxsNotice;
  }
  interface HTMLElementEventMap {
    'lxs-notice-close': CustomEvent<undefined>;
  }
}

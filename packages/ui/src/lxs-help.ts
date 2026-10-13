import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ChevronLeft, ChevronRight, X } from 'lucide';
import { illustration } from './help-illustrations';
import { helpSteps } from './help-steps';
import { illustrationStyles } from './help-styles';
import { icon } from './icons';
import { sharedStyles } from './styles';

/** How far a swipe must travel to change cards, in px. */
const SWIPE_PX = 40;
/** Touch screens get touch wording ("tap", "one finger"). */
const TOUCH = '(pointer: coarse)';

/**
 * "Getting started": a short carousel of cards, each with a looping
 * illustration, a title and a sentence or two (ADR 0046). A modal dialog:
 * Esc, ✕ or a click outside closes it.
 *
 * @fires lxs-help-close - the user closed it.
 */
@customElement('lxs-help')
@localized()
export class LxsHelp extends LitElement {
  static override styles = [
    sharedStyles,
    illustrationStyles,
    css`
      dialog {
        width: min(440px, calc(100vw - 2 * var(--lxs-sp-4)));
        padding: 0;
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-lg);
        background: var(--lxs-surface-1);
        color: var(--lxs-text);
        box-shadow: var(--lxs-shadow);
        font-family: var(--lxs-font-ui);
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.5);
      }
      .close {
        position: absolute;
        top: var(--lxs-sp-2);
        right: var(--lxs-sp-2);
        /* Solid, so it reads over the illustration. */
        border-radius: 50%;
        background: var(--lxs-overlay);
      }
      .art {
        display: block;
        width: 100%;
        aspect-ratio: 240 / 150;
        border-bottom: 1px solid var(--lxs-line);
        background: var(--lxs-viewport-bg);
        touch-action: pan-y;
      }
      .text {
        /* Room for the longest card, so the buttons don't jump between cards. */
        min-height: 7.5em;
        padding: var(--lxs-sp-4) var(--lxs-sp-4) 0;
      }
      h2 {
        margin: 0 0 var(--lxs-sp-2);
        font-size: var(--lxs-fs-lg);
      }
      p {
        margin: 0;
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-sm);
        line-height: 1.5;
      }
      .manual {
        display: inline-block;
        margin-top: var(--lxs-sp-2);
        color: var(--lxs-accent);
        font-size: var(--lxs-fs-sm);
      }
      footer {
        display: flex;
        align-items: center;
        gap: var(--lxs-sp-2);
        padding: var(--lxs-sp-3) var(--lxs-sp-4) var(--lxs-sp-4);
      }
      .dots {
        display: flex;
        flex: 1;
        justify-content: center;
        gap: 6px;
      }
      .dots button {
        width: 8px;
        height: 8px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: var(--lxs-line-strong);
        cursor: pointer;
      }
      .dots button[aria-current='step'] {
        background: var(--lxs-accent);
      }
      .primary {
        border-color: transparent;
        background: var(--lxs-accent);
        color: var(--lxs-on-accent);
      }
      .primary:hover {
        background: var(--lxs-accent-hover);
      }
      .back[hidden] {
        visibility: hidden;
        display: inline-flex;
      }
    `,
  ];

  /** Shown as a modal while true. */
  @property({ type: Boolean }) open = false;
  /** Includes the step about loading your own IES file. */
  @property({ type: Boolean, attribute: 'ies-import' }) iesImport = false;
  /** The full manual, in the current language; the last card links to it. Empty for no link. */
  @property({ attribute: 'manual-url' }) manualUrl = '';

  @state() private index = 0;
  @query('dialog') private dialog!: HTMLDialogElement;
  #swipeStart: number | undefined;

  override render() {
    const steps = helpSteps({
      touch: window.matchMedia(TOUCH).matches,
      iesImport: this.iesImport,
    });
    const index = Math.min(this.index, steps.length - 1);
    const step = steps[index]!;
    const last = index === steps.length - 1;
    return html`<dialog
      aria-labelledby="title"
      @close=${this.#onClose}
      @click=${this.#onBackdropClick}
      @keydown=${this.#onKeyDown}
    >
      <button class="icon-btn close" type="button" aria-label=${msg('Close')} @click=${this.#close}>
        ${icon(X)}
      </button>
      <svg
        class="art ${step.illustration}"
        viewBox="0 0 240 150"
        aria-hidden="true"
        @pointerdown=${(event: PointerEvent) => (this.#swipeStart = event.clientX)}
        @pointerup=${this.#onSwipeEnd}
      >
        ${illustration(step.illustration)}
      </svg>
      <div class="text" aria-live="polite">
        <h2 id="title">${step.title}</h2>
        <p>${step.body}</p>
        ${
          last && this.manualUrl
            ? html`<a class="manual" href=${this.manualUrl} target="_blank" rel="noopener"
                >${msg('Read the full manual')} ↗</a
              >`
            : ''
        }
      </div>
      <footer>
        <button
          class="btn back"
          type="button"
          ?hidden=${index === 0}
          @click=${() => this.#go(index - 1)}
        >
          ${icon(ChevronLeft)} ${msg('Back')}
        </button>
        <div class="dots">
          ${steps.map(
            (_, i) =>
              html`<button
                type="button"
                aria-label=${msg(str`Step ${i + 1} of ${steps.length}`)}
                aria-current=${i === index ? 'step' : 'false'}
                @click=${() => this.#go(i)}
              ></button>`,
          )}
        </div>
        <button
          class="btn primary"
          type="button"
          @click=${() => (last ? this.#close() : this.#go(index + 1))}
        >
          ${last ? msg('Start') : html`${msg('Next')} ${icon(ChevronRight)}`}
        </button>
      </footer>
    </dialog>`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has('open')) return;
    if (this.open && !this.dialog.open) {
      this.index = 0;
      this.dialog.showModal();
      // The dialog would focus ✕, its first button; "Next" is what people want.
      this.renderRoot.querySelector<HTMLButtonElement>('.primary')?.focus();
    } else if (!this.open && this.dialog.open) {
      this.dialog.close();
    }
  }

  #go(index: number): void {
    const count = helpSteps({ touch: false, iesImport: this.iesImport }).length;
    this.index = Math.max(0, Math.min(count - 1, index));
  }

  #close = (): void => {
    this.dialog.close();
  };

  /** Esc, ✕, "Start" and backdrop clicks all end here. */
  #onClose = (): void => {
    this.dispatchEvent(new CustomEvent('lxs-help-close', { bubbles: true, composed: true }));
  };

  /** A click on the dialog element itself, not its content, is on the backdrop. */
  #onBackdropClick = (event: MouseEvent): void => {
    if (event.target === this.dialog) this.#close();
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowRight') this.#go(this.index + 1);
    if (event.key === 'ArrowLeft') this.#go(this.index - 1);
  };

  #onSwipeEnd = (event: PointerEvent): void => {
    if (this.#swipeStart === undefined) return;
    const dx = event.clientX - this.#swipeStart;
    this.#swipeStart = undefined;
    if (Math.abs(dx) >= SWIPE_PX) this.#go(this.index + (dx < 0 ? 1 : -1));
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-help': LxsHelp;
  }
  interface HTMLElementEventMap {
    'lxs-help-close': CustomEvent<object>;
  }
}

import type { Simulator } from '@lighting-sim/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Moon, PanelLeft, PanelRight, Redo2, Sun, Undo2 } from 'lucide';
import { icon } from './icons';
import type { Locale } from './localization';
import { segmentedStyles, sharedStyles } from './styles';

export type Theme = 'dark' | 'light';
export type PanelName = 'library' | 'inspector';

/**
 * Top bar: host brand (slot), undo/redo, panel toggles, theme and language.
 * Undo/redo are document edits and go to the Simulator directly (ADR 0025);
 * the rest is UI state, reported as events.
 *
 * @slot brand - The host's logo or name.
 * @fires lsim-theme-change - `detail: { theme }`
 * @fires lsim-locale-request - `detail: { locale }`
 * @fires lsim-panel-toggle - `detail: { panel }`
 */
@customElement('lsim-top-bar')
@localized()
export class LsimTopBar extends LitElement {
  static override styles = [
    sharedStyles,
    segmentedStyles,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: var(--lsim-sp-3);
        padding: 0 var(--lsim-sp-3);
        background: var(--lsim-surface-1);
        border-bottom: 1px solid var(--lsim-line);
      }
      .side {
        display: flex;
        align-items: center;
        gap: var(--lsim-sp-1);
        flex: 1;
      }
      .side.end {
        justify-content: flex-end;
      }
      ::slotted(*) {
        font-weight: 600;
      }
      .icon-btn:disabled {
        opacity: 0.35;
        cursor: default;
        background: transparent;
      }
      .icon-btn[aria-pressed='false'] {
        color: var(--lsim-text-faint);
      }
      .divider {
        width: 1px;
        height: 20px;
        margin: 0 var(--lsim-sp-1);
        background: var(--lsim-line);
      }
    `,
  ];

  @property({ attribute: false }) simulator: Simulator | undefined;
  /** Re-render trigger: set to each new scene so undo/redo availability updates. */
  @property({ attribute: false }) scene: unknown;
  @property() theme: Theme = 'dark';
  @property() locale: Locale = 'es-AR';
  @property({ attribute: false }) libraryOpen = true;
  @property({ attribute: false }) inspectorOpen = true;

  override render() {
    const sim = this.simulator;
    return html`
      <div class="side"><slot name="brand"></slot></div>
      <div class="side" style="flex: none">
        ${this.#button(msg('Undo'), icon(Undo2), () => sim?.undo(), { disabled: !sim?.canUndo() })}
        ${this.#button(msg('Redo'), icon(Redo2), () => sim?.redo(), { disabled: !sim?.canRedo() })}
      </div>
      <div class="side end">
        ${this.#button(
          msg('Show library'),
          icon(PanelLeft),
          () => this.#emit('lsim-panel-toggle', { panel: 'library' }),
          {
            pressed: this.libraryOpen,
          },
        )}
        ${this.#button(
          msg('Show inspector'),
          icon(PanelRight),
          () => this.#emit('lsim-panel-toggle', { panel: 'inspector' }),
          { pressed: this.inspectorOpen },
        )}
        ${this.#button(
          this.theme === 'dark' ? msg('Light theme') : msg('Dark theme'),
          icon(this.theme === 'dark' ? Sun : Moon),
          () =>
            this.#emit('lsim-theme-change', { theme: this.theme === 'dark' ? 'light' : 'dark' }),
        )}
        <span class="divider"></span>
        <div class="segmented" role="radiogroup" aria-label=${msg('Language')}>
          ${(['es-AR', 'en'] as const).map(
            (locale) =>
              html`<button
                type="button"
                role="radio"
                aria-checked=${this.locale === locale}
                @click=${() => this.#emit('lsim-locale-request', { locale })}
              >
                ${locale === 'es-AR' ? 'ES' : 'EN'}
              </button>`,
          )}
        </div>
      </div>
    `;
  }

  #button(
    label: string,
    content: unknown,
    onClick: () => void,
    { disabled = false, pressed }: { disabled?: boolean; pressed?: boolean } = {},
  ) {
    return html`<button
      class="icon-btn"
      type="button"
      aria-label=${label}
      title=${label}
      aria-pressed=${pressed === undefined ? 'false' : String(pressed)}
      ?disabled=${disabled}
      @click=${onClick}
    >
      ${content}
    </button>`;
  }

  #emit(type: string, detail: object): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lsim-top-bar': LsimTopBar;
  }
  interface HTMLElementEventMap {
    'lsim-theme-change': CustomEvent<{ theme: Theme }>;
    'lsim-locale-request': CustomEvent<{ locale: Locale }>;
    'lsim-panel-toggle': CustomEvent<{ panel: PanelName }>;
  }
}

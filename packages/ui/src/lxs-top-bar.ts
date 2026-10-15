import type { Simulator } from '@luxstudio/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import {
  Camera,
  CircleQuestionMark,
  Ellipsis,
  FilePlus,
  FolderOpen,
  Moon,
  PanelLeft,
  PanelRight,
  Redo2,
  Save,
  Sun,
  Undo2,
} from 'lucide';
import { icon } from './icons';
import type { Locale } from './localization';
import { segmentedStyles, sharedStyles } from './styles';

/** The UI colour theme. */
export type Theme = 'dark' | 'light';
/** A side panel the top bar can show or hide. */
export type PanelName = 'library' | 'inspector';

/**
 * Top bar: host brand (slot), undo/redo, new, open and save, panel toggles, theme
 * and language. `compact` (phones) keeps brand and undo/redo, and moves the
 * rest into a ⋯ menu (a native popover).
 * Undo/redo are document edits and go to the Simulator directly (ADR 0025);
 * the rest is UI state, reported as events.
 *
 * @slot brand - The host's logo or name.
 * @fires lxs-theme-change - `detail: { theme }`
 * @fires lxs-locale-request - `detail: { locale }`
 * @fires lxs-panel-toggle - `detail: { panel }`
 * @fires lxs-new-request - the user wants to start a new scene from a template
 * @fires lxs-open-request - the user wants to open a scene file
 * @fires lxs-save-request - the user wants to save the scene to a file
 * @fires lxs-screenshot-request
 * @fires lxs-help-request - the user asked for the getting-started help
 */
@customElement('lxs-top-bar')
@localized()
export class LxsTopBar extends LitElement {
  static override styles = [
    sharedStyles,
    segmentedStyles,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: var(--lxs-sp-3);
        padding: 0 var(--lxs-sp-3);
        background: var(--lxs-surface-1);
        border-bottom: 1px solid var(--lxs-line);
      }
      .side {
        display: flex;
        align-items: center;
        gap: var(--lxs-sp-1);
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
        color: var(--lxs-text-faint);
      }
      [popover] {
        position: fixed;
        inset: auto;
        margin: 0;
        padding: var(--lxs-sp-2);
        min-width: 200px;
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-lg);
        background: var(--lxs-surface-1);
        color: var(--lxs-text);
        box-shadow: var(--lxs-shadow);
      }
      .menu-item {
        display: flex;
        align-items: center;
        gap: var(--lxs-sp-3);
        width: 100%;
        min-height: var(--lxs-control-h);
        padding: 0 var(--lxs-sp-3);
        border: 0;
        border-radius: var(--lxs-r-md);
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .menu-item:hover {
        background: var(--lxs-surface-3);
      }
      .menu-row {
        padding: var(--lxs-sp-2) var(--lxs-sp-3);
      }
      .divider {
        width: 1px;
        height: 20px;
        margin: 0 var(--lxs-sp-1);
        background: var(--lxs-line);
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
  /** Phone layout: fewer buttons, the rest in a ⋯ menu. */
  @property({ type: Boolean, reflect: true }) compact = false;

  @query('[popover]') private menu!: HTMLElement;
  @query('.menu-button') private menuButton!: HTMLElement;

  override render() {
    const sim = this.simulator;
    const undoRedo = html`
      ${this.#button(msg('Undo'), icon(Undo2), () => sim?.undo(), { disabled: !sim?.canUndo() })}
      ${this.#button(msg('Redo'), icon(Redo2), () => sim?.redo(), { disabled: !sim?.canRedo() })}
    `;
    if (this.compact) {
      return html`
        <div class="side"><slot name="brand"></slot></div>
        <div class="side end">
          ${undoRedo}
          <button
            class="icon-btn menu-button"
            type="button"
            popovertarget="menu"
            aria-label=${msg('More options')}
            title=${msg('More options')}
          >
            ${icon(Ellipsis)}
          </button>
        </div>
        <div id="menu" popover role="menu" @beforetoggle=${this.#placeMenu}>
          <button class="menu-item" type="button" role="menuitem" @click=${this.#new}>
            ${icon(FilePlus)} ${msg('New…')}
          </button>
          <button class="menu-item" type="button" role="menuitem" @click=${this.#open}>
            ${icon(FolderOpen)} ${msg('Open…')}
          </button>
          <button class="menu-item" type="button" role="menuitem" @click=${this.#save}>
            ${icon(Save)} ${msg('Save')}
          </button>
          <button class="menu-item" type="button" role="menuitem" @click=${this.#screenshot}>
            ${icon(Camera)} ${msg('Screenshot')}
          </button>
          <button class="menu-item" type="button" role="menuitem" @click=${this.#toggleTheme}>
            ${icon(this.theme === 'dark' ? Sun : Moon)} ${this.#themeLabel()}
          </button>
          <button class="menu-item" type="button" role="menuitem" @click=${this.#help}>
            ${icon(CircleQuestionMark)} ${msg('Help')}
          </button>
          <div class="menu-row">${this.#languageToggle()}</div>
        </div>
      `;
    }
    return html`
      <div class="side"><slot name="brand"></slot></div>
      <div class="side" style="flex: none">${undoRedo}</div>
      <div class="side end">
        ${this.#button(msg('New…'), icon(FilePlus), this.#new)}
        ${this.#button(msg('Open…'), icon(FolderOpen), this.#open)}
        ${this.#button(msg('Save'), icon(Save), this.#save)}
        ${this.#button(msg('Screenshot'), icon(Camera), this.#screenshot)}
        <span class="divider"></span>
        ${this.#button(
          msg('Show library'),
          icon(PanelLeft),
          () => this.#emit('lxs-panel-toggle', { panel: 'library' }),
          { pressed: this.libraryOpen },
        )}
        ${this.#button(
          msg('Show inspector'),
          icon(PanelRight),
          () => this.#emit('lxs-panel-toggle', { panel: 'inspector' }),
          { pressed: this.inspectorOpen },
        )}
        ${this.#button(this.#themeLabel(), icon(this.theme === 'dark' ? Sun : Moon), this.#toggleTheme)}
        <span class="divider"></span>
        ${this.#languageToggle()} ${this.#button(msg('Help'), icon(CircleQuestionMark), this.#help)}
      </div>
    `;
  }

  #themeLabel(): string {
    return this.theme === 'dark' ? msg('Light theme') : msg('Dark theme');
  }

  #languageToggle() {
    return html`<div class="segmented" role="radiogroup" aria-label=${msg('Language')}>
      ${(['es-AR', 'en'] as const).map(
        (locale) =>
          html`<button
            type="button"
            role="radio"
            aria-checked=${this.locale === locale}
            @click=${() => {
              this.#closeMenu();
              this.#emit('lxs-locale-request', { locale });
            }}
          >
            ${locale === 'es-AR' ? 'ES' : 'EN'}
          </button>`,
      )}
    </div>`;
  }

  #help = (): void => {
    this.#closeMenu();
    this.#emit('lxs-help-request', {});
  };

  #new = (): void => {
    this.#closeMenu();
    this.#emit('lxs-new-request', {});
  };

  #open = (): void => {
    this.#closeMenu();
    this.#emit('lxs-open-request', {});
  };

  #save = (): void => {
    this.#closeMenu();
    this.#emit('lxs-save-request', {});
  };

  #screenshot = (): void => {
    this.#closeMenu();
    this.#emit('lxs-screenshot-request', {});
  };

  #toggleTheme = (): void => {
    this.#closeMenu();
    this.#emit('lxs-theme-change', { theme: this.theme === 'dark' ? 'light' : 'dark' });
  };

  /** Menu choices close the ⋯ menu (no-op outside compact mode). */
  #closeMenu(): void {
    if (this.menu?.matches(':popover-open')) this.menu.hidePopover();
  }

  /** Popovers open in the top layer; anchor this one under the ⋯ button, right-aligned. */
  #placeMenu = (event: Event): void => {
    if ((event as ToggleEvent).newState !== 'open') return;
    const button = this.menuButton.getBoundingClientRect();
    this.menu.style.top = `${button.bottom + 4}px`;
    this.menu.style.right = `${window.innerWidth - button.right}px`;
  };

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
    'lxs-top-bar': LxsTopBar;
  }
  interface HTMLElementEventMap {
    'lxs-theme-change': CustomEvent<{ theme: Theme }>;
    'lxs-locale-request': CustomEvent<{ locale: Locale }>;
    'lxs-panel-toggle': CustomEvent<{ panel: PanelName }>;
    'lxs-new-request': CustomEvent<object>;
    'lxs-open-request': CustomEvent<object>;
    'lxs-save-request': CustomEvent<object>;
    'lxs-screenshot-request': CustomEvent<object>;
    'lxs-help-request': CustomEvent<object>;
  }
}

import type { PickEvent, Scene, Simulator } from '@lighting-sim/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DEFAULT_LOCALE, setLocale, type Locale } from './localization';
import { pruneSelection, selectionAfterPick } from './selection';
import './lsim-viewport';

/**
 * The full simulator UI: top bar, library panel, viewport, inspector and
 * status bar. Owns the selection and passes it down (ADR 0021).
 *
 * ```html
 * <lsim-app .simulator=${simulator} locale="es-AR"></lsim-app>
 * ```
 */
@customElement('lsim-app')
@localized()
export class LsimApp extends LitElement {
  static override styles = css`
    :host {
      display: grid;
      height: 100%;
      grid-template-columns: var(--lsim-panel-w) minmax(0, 1fr) var(--lsim-inspector-w);
      grid-template-rows: var(--lsim-topbar-h) minmax(0, 1fr) var(--lsim-statusbar-h);
      grid-template-areas:
        'top top top'
        'left viewport right'
        'status status status';
      background: var(--lsim-bg);
      color: var(--lsim-text);
      font: var(--lsim-fs-md) / 1.45 var(--lsim-font-ui);
      -webkit-font-smoothing: antialiased;
    }
    header {
      grid-area: top;
      display: flex;
      align-items: center;
      padding: 0 var(--lsim-sp-4);
      background: var(--lsim-surface-1);
      border-bottom: 1px solid var(--lsim-line);
    }
    aside {
      background: var(--lsim-surface-1);
      min-height: 0;
      overflow: auto;
    }
    .library {
      grid-area: left;
      border-right: 1px solid var(--lsim-line);
    }
    .inspector {
      grid-area: right;
      border-left: 1px solid var(--lsim-line);
    }
    h2 {
      margin: 0;
      padding: var(--lsim-sp-3) var(--lsim-sp-4);
      font-size: var(--lsim-fs-md);
      font-weight: 600;
      border-bottom: 1px solid var(--lsim-line);
    }
    lsim-viewport {
      grid-area: viewport;
      min-width: 0;
    }
    footer {
      grid-area: status;
      display: flex;
      align-items: center;
      gap: var(--lsim-sp-4);
      padding: 0 var(--lsim-sp-4);
      background: var(--lsim-surface-1);
      border-top: 1px solid var(--lsim-line);
      color: var(--lsim-text-muted);
      font-size: var(--lsim-fs-xs);
    }
    /* Tablet: the inspector floats over the bottom of the viewport. */
    @media (max-width: 900px) {
      :host {
        grid-template-columns: var(--lsim-panel-w) minmax(0, 1fr);
        grid-template-areas:
          'top top'
          'left viewport'
          'status status';
      }
      .inspector {
        grid-area: viewport;
        align-self: end;
        max-height: 45%;
        margin: var(--lsim-sp-2);
        border: 1px solid var(--lsim-line);
        border-radius: var(--lsim-r-lg);
        box-shadow: var(--lsim-shadow);
      }
    }
    /* Phone: view-only. */
    @media (max-width: 600px) {
      :host {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas: 'top' 'viewport' 'status';
      }
      aside {
        display: none;
      }
    }
  `;

  @property({ attribute: false }) simulator: Simulator | undefined;
  /** UI language for the whole page. */
  @property() locale: Locale = DEFAULT_LOCALE;

  @state() private selection: readonly string[] = [];
  @state() private scene: Scene | undefined;
  #unsubscribe: (() => void) | undefined;

  override render() {
    const total = this.scene?.luminaires.length ?? 0;
    const selected = this.selection.length;
    return html`
      <header></header>
      <aside class="library"><h2>${msg('Catalog')}</h2></aside>
      <lsim-viewport
        .simulator=${this.simulator}
        .highlighted=${this.selection}
        @lsim-pick=${this.#onPick}
      ></lsim-viewport>
      <aside class="inspector"><h2>${msg('Inspector')}</h2></aside>
      <footer>
        <span>${msg(str`Luminaires: ${total}`)}</span>
        <span>${msg(str`Selected: ${selected}`)}</span>
      </footer>
    `;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.#onKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.#onKeyDown);
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('locale')) setLocale(this.locale).catch(console.error);
    if (changed.has('simulator')) this.#watch(this.simulator);
  }

  #watch(simulator: Simulator | undefined): void {
    this.#unsubscribe?.();
    this.scene = simulator?.scene;
    this.selection = [];
    this.#unsubscribe = simulator?.subscribe((scene) => {
      this.scene = scene;
      this.selection = pruneSelection(this.selection, scene);
    });
  }

  #onPick = ({ detail }: CustomEvent<PickEvent>): void => {
    this.selection = selectionAfterPick(this.selection, detail.luminaireId, detail.event.shiftKey);
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const typing = event
      .composedPath()
      .some(
        (target) => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement,
      );
    if (event.key === 'Escape' && !typing) this.selection = [];
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'lsim-app': LsimApp;
  }
}

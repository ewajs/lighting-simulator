import type { PickEvent, RenderMode, Scene, Simulator, ViewName } from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { EMPTY_DISPLAY_CATALOG, type DisplayCatalog } from './display-catalog';
import { newMergeKey } from './field-change';
import { DEFAULT_LOCALE, setLocale, type Locale } from './localization';
import './lxs-inspector';
import './lxs-library';
import type { SetSelectionDetail } from './lxs-luminaire-inspector';
import type { SelectDetail } from './lxs-scene-panel';
import './lxs-top-bar';
import type { PanelName, Theme } from './lxs-top-bar';
import './lxs-viewport';
import type { DropProductDetail, LxsViewport } from './lxs-viewport';
import './lxs-viewport-controls';
import { pruneSelection, selectionAfterPick } from './selection';
import { isTyping, shortcutAction, type ShortcutAction } from './shortcuts';

/**
 * The full simulator UI: top bar, library panel, viewport with its controls,
 * inspector and status bar. Owns UI state (selection, view settings, panels,
 * theme) and passes it down (ADR 0021); document edits go to the Simulator
 * (ADR 0025).
 *
 * ```html
 * <lxs-app .simulator=${simulator} .catalog=${displayCatalog} locale="es-AR">
 *   <img slot="brand" src="logo.svg" alt="Acme" />
 * </lxs-app>
 * ```
 *
 * @slot brand - The host's logo or name, shown in the top bar.
 * @fires lxs-locale-change - after the UI language changed: `detail: { locale }`.
 *   Hosts update `catalog` names in response.
 */
@customElement('lxs-app')
@localized()
export class LxsApp extends LitElement {
  static override styles = css`
    :host {
      --lxs-left-w: var(--lxs-panel-w);
      --lxs-right-w: var(--lxs-inspector-w);
      display: grid;
      height: 100%;
      grid-template-columns: var(--lxs-left-w) minmax(0, 1fr) var(--lxs-right-w);
      grid-template-rows: var(--lxs-topbar-h) minmax(0, 1fr) var(--lxs-statusbar-h);
      grid-template-areas:
        'top top top'
        'left viewport right'
        'status status status';
      background: var(--lxs-bg);
      color: var(--lxs-text);
      font: var(--lxs-fs-md) / 1.45 var(--lxs-font-ui);
      -webkit-font-smoothing: antialiased;
    }
    :host([library-collapsed]) {
      --lxs-left-w: 48px;
    }
    :host([inspector-collapsed]) {
      --lxs-right-w: 0px;
    }
    :host([inspector-collapsed]) .inspector {
      display: none;
    }
    lxs-top-bar {
      grid-area: top;
    }
    lxs-library {
      grid-area: left;
      border-right: 1px solid var(--lxs-line);
    }
    .inspector {
      grid-area: right;
      border-left: 1px solid var(--lxs-line);
    }
    .stage {
      grid-area: viewport;
      position: relative;
      min-width: 0;
      min-height: 0;
    }
    lxs-viewport {
      position: absolute;
      inset: 0;
    }
    footer {
      grid-area: status;
      display: flex;
      align-items: center;
      gap: var(--lxs-sp-4);
      padding: 0 var(--lxs-sp-4);
      background: var(--lxs-surface-1);
      border-top: 1px solid var(--lxs-line);
      color: var(--lxs-text-muted);
      font-size: var(--lxs-fs-xs);
    }
    /* Tablet: the inspector floats over the bottom of the viewport. */
    @media (max-width: 900px) {
      :host {
        grid-template-columns: var(--lxs-left-w) minmax(0, 1fr);
        grid-template-areas:
          'top top'
          'left viewport'
          'status status';
      }
      .inspector {
        grid-area: viewport;
        z-index: 1;
        align-self: end;
        max-height: 45%;
        margin: var(--lxs-sp-2);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-lg);
        box-shadow: var(--lxs-shadow);
      }
    }
    /* Phone: view-only. */
    @media (max-width: 600px) {
      :host {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas: 'top' 'viewport' 'status';
      }
      lxs-library,
      .inspector {
        display: none;
      }
    }
  `;

  @property({ attribute: false }) simulator: Simulator | undefined;
  /** Product names, categories and thumbnails, in the active language. */
  @property({ attribute: false }) catalog: DisplayCatalog = EMPTY_DISPLAY_CATALOG;
  /** UI language for the whole page. */
  @property() locale: Locale = DEFAULT_LOCALE;
  /** Colour theme; reflected so the theme tokens apply to this subtree. */
  @property({ reflect: true, attribute: 'data-lxs-theme' }) theme: Theme = 'dark';
  @property({ type: Boolean, reflect: true, attribute: 'library-collapsed' }) libraryCollapsed =
    false;
  @property({ type: Boolean, reflect: true, attribute: 'inspector-collapsed' }) inspectorCollapsed =
    false;

  @state() private selection: readonly string[] = [];
  @state() private scene: Scene | undefined;
  @state() private renderMode: RenderMode = 'realistic';
  @state() private exposureEv = 0;
  @state() private view: ViewName = 'perspective';

  @query('lxs-viewport') private viewport!: LxsViewport;
  #unsubscribe: (() => void) | undefined;

  override render() {
    const total = this.scene?.luminaires.length ?? 0;
    const selected = this.selection.length;
    return html`
      <lxs-top-bar
        .simulator=${this.simulator}
        .scene=${this.scene}
        .theme=${this.theme}
        .locale=${this.locale}
        .libraryOpen=${!this.libraryCollapsed}
        .inspectorOpen=${!this.inspectorCollapsed}
        @lxs-theme-change=${({ detail }: CustomEvent<{ theme: Theme }>) => (this.theme = detail.theme)}
        @lxs-locale-request=${({ detail }: CustomEvent<{ locale: Locale }>) => (this.locale = detail.locale)}
        @lxs-panel-toggle=${({ detail }: CustomEvent<{ panel: PanelName }>) => this.#togglePanel(detail.panel)}
      >
        <slot name="brand" slot="brand"></slot>
      </lxs-top-bar>
      <lxs-library
        .display=${this.catalog}
        .products=${this.simulator?.catalog}
        .scene=${this.scene}
        .selection=${this.selection}
        .collapsed=${this.libraryCollapsed}
        @lxs-add-product=${this.#onAddProduct}
        @lxs-select=${this.#onSelect}
        @lxs-collapse-request=${({ detail }: CustomEvent<{ collapsed: boolean }>) =>
          (this.libraryCollapsed = detail.collapsed)}
      ></lxs-library>
      <div class="stage">
        <lxs-viewport
          .simulator=${this.simulator}
          .highlighted=${this.selection}
          .renderMode=${this.renderMode}
          .exposureEv=${this.exposureEv}
          @lxs-pick=${this.#onPick}
          @lxs-drop-product=${this.#onDropProduct}
        ></lxs-viewport>
        <lxs-viewport-controls
          .renderMode=${this.renderMode}
          .view=${this.view}
          .exposureEv=${this.exposureEv}
          @lxs-render-mode-change=${({ detail }: CustomEvent<{ mode: RenderMode }>) => (this.renderMode = detail.mode)}
          @lxs-exposure-change=${({ detail }: CustomEvent<{ ev: number }>) => (this.exposureEv = detail.ev)}
          @lxs-view-request=${({ detail }: CustomEvent<{ view: ViewName }>) => this.#setView(detail.view)}
          @lxs-frame-request=${() => this.viewport.frame(this.selection)}
        ></lxs-viewport-controls>
      </div>
      <lxs-inspector
        class="inspector"
        .simulator=${this.simulator}
        .scene=${this.scene}
        .selection=${this.selection}
        .display=${this.catalog}
        @lxs-set-selection=${({ detail }: CustomEvent<SetSelectionDetail>) => (this.selection = detail.ids)}
      ></lxs-inspector>
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
    if (changed.has('locale'))
      void this.#applyLocale(this.locale, changed.get('locale') !== undefined);
    if (changed.has('simulator')) this.#watch(this.simulator);
  }

  async #applyLocale(locale: Locale, announce: boolean): Promise<void> {
    try {
      await setLocale(locale);
    } catch (error) {
      console.error(error);
      return;
    }
    if (announce) {
      this.dispatchEvent(
        new CustomEvent('lxs-locale-change', {
          detail: { locale },
          bubbles: true,
          composed: true,
        }),
      );
    }
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

  #togglePanel(panel: PanelName): void {
    if (panel === 'library') this.libraryCollapsed = !this.libraryCollapsed;
    else this.inspectorCollapsed = !this.inspectorCollapsed;
  }

  #setView(view: ViewName): void {
    this.view = view;
    this.viewport.setView(view);
  }

  #onPick = ({ detail }: CustomEvent<PickEvent>): void => {
    this.selection = selectionAfterPick(this.selection, detail.luminaireId, detail.event.shiftKey);
  };

  #onSelect = ({ detail }: CustomEvent<SelectDetail>): void => {
    this.selection = selectionAfterPick(this.selection, detail.luminaireId, detail.toggle);
  };

  #onAddProduct = ({ detail }: CustomEvent<{ productId: string }>): void => {
    if (this.simulator) this.selection = [this.simulator.addLuminaire(detail.productId)];
  };

  #onDropProduct = ({ detail }: CustomEvent<DropProductDetail>): void => {
    if (this.simulator) this.selection = [this.simulator.addLuminaire(detail.productId, detail.at)];
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (isTyping(event)) return;
    const action = shortcutAction(event);
    if (!action) return;
    event.preventDefault();
    this.#run(action);
  };

  /** Applies a keyboard shortcut (docs/SPEC.md §5). */
  #run(action: ShortcutAction): void {
    const sim = this.simulator;
    switch (action.type) {
      case 'undo':
        return sim?.undo();
      case 'redo':
        return sim?.redo();
      case 'delete':
        if (this.selection.length) sim?.removeLuminaires(this.selection);
        return;
      case 'duplicate':
        if (sim && this.selection.length) this.selection = sim.duplicateLuminaires(this.selection);
        return;
      case 'select-all':
        this.selection = this.scene?.luminaires.map((l) => l.id) ?? [];
        return;
      case 'deselect':
        this.selection = [];
        return;
      case 'toggle-on': {
        const selected = this.scene?.luminaires.filter((l) => this.selection.includes(l.id)) ?? [];
        const on = !selected.some((l) => l.on);
        const mergeKey = newMergeKey();
        for (const { id } of selected) sim?.updateLuminaire(id, { on }, { mergeKey });
        return;
      }
      case 'frame':
        return this.viewport.frame(this.selection);
      case 'render-mode':
        this.renderMode = action.mode;
        return;
      case 'view':
        return this.#setView(action.view);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-app': LxsApp;
  }
  interface HTMLElementEventMap {
    'lxs-locale-change': CustomEvent<{ locale: Locale }>;
  }
}

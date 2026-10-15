import type {
  FurnitureKind,
  Logger,
  MoveStartEvent,
  PickEvent,
  RenderMode,
  Scene,
  Simulator,
  ViewName,
} from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { Eye, Layers, LayoutGrid, SlidersHorizontal } from 'lucide';
import { appStyles } from './lxs-app.styles';
import { EMPTY_DISPLAY_CATALOG, type DisplayCatalog } from './display-catalog';
import { newMergeKey } from './field-change';
import { datedFileName } from './format';
import { writeAutosave } from './autosave';
import './lxs-new-scene';
import type { TemplatePickDetail } from './lxs-new-scene';
import './lxs-notice';
import type { Notice } from './lxs-notice';
import { download, openSceneFile, saveSceneFile, SCENE_FILE_ACCEPT } from './scene-files';
import { helpSeen, markHelpSeen } from './help-seen';
import { DEFAULT_LOCALE, setLocale, type Locale } from './localization';
import './lxs-catalog-panel';
import './lxs-help';
import './lxs-inspector';
import './lxs-library';
import type { SetSelectionDetail } from './lxs-luminaire-inspector';
import './lxs-scene-panel';
import type { SelectDetail } from './lxs-scene-panel';
import './lxs-sheet';
import './lxs-tab-bar';
import type { TabBarItem } from './lxs-tab-bar';
import './lxs-top-bar';
import type { PanelName, Theme } from './lxs-top-bar';
import './lxs-viewport';
import type {
  DropFileDetail,
  DropFurnitureDetail,
  DropProductDetail,
  LxsViewport,
} from './lxs-viewport';
import './lxs-viewport-controls';
import { pruneSelection, selectionAfterPick, selectionForMove, selectionKind } from './selection';
import { isTyping, shortcutAction, type EditTool, type ShortcutAction } from './shortcuts';

/** How long after the last change the scene is autosaved, in ms. */
const AUTOSAVE_DELAY_MS = 1000;
/** Below this width the library starts collapsed, leaving the viewport room (landscape tablets). */
const AUTO_COLLAPSE_LIBRARY_BELOW_PX = 1200;
/** Matches the narrow layout in the styles below, where the inspector becomes a sheet over the viewport. */
const NARROW_LAYOUT = '(max-width: 900px)';
/** Phones: a full-screen viewport with a tab bar and sheets instead of side panels (ADR 0031). */
const PHONE_LAYOUT =
  '(max-width: 600px), (max-height: 500px) and (orientation: landscape) and (pointer: coarse)';
/** Within the phone layout: tab bar as a left rail, sheets from the right. */
const LANDSCAPE = '(orientation: landscape)';

type PhoneTab = 'catalog' | 'scene' | 'properties' | 'view';

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
 * @fires lxs-screenshot - cancelable, `detail: ScreenshotDetail`. Unless the host calls
 *   `preventDefault()`, the PNG is downloaded.
 * @fires lxs-locale-change - after the UI language changed: `detail: { locale }`.
 *   Hosts update `catalog` names in response.
 * @fires lxs-import-ies - with `ies-import` set, when the user adds their own IES file:
 *   `detail: ImportIesDetail`. Hosts add the product to their catalogs (ADR 0037).
 */
@customElement('lxs-app')
@localized()
export class LxsApp extends LitElement {
  static override styles = appStyles;

  @property({ attribute: false }) simulator: Simulator | undefined;
  /** Product names, categories and thumbnails, in the active language. */
  @property({ attribute: false }) catalog: DisplayCatalog = EMPTY_DISPLAY_CATALOG;
  /** Lets the user load their own IES file from the catalog panel (ADR 0037). */
  @property({ type: Boolean, attribute: 'ies-import' }) iesImport = false;
  /**
   * Opens the getting-started help when the app starts, unless this browser
   * has seen it before (ADR 0046). The "?" button opens it any time.
   */
  @property({ type: Boolean, attribute: 'help-on-start' }) helpOnStart = false;
  /** The full user manual, per language; the help's last card links to it. */
  @property({ attribute: false }) manualUrls: Partial<Record<Locale, string>> = {};
  /**
   * Keeps the scene in this browser's localStorage as it changes, a second
   * after the last edit (ADR 0052). Start the Simulator from `loadAutosave()`
   * to pick up where the user left off.
   */
  @property({ type: Boolean }) autosave = false;
  /** Shows frame rate, backend, shadows and draw counts over the viewport, for debugging (ADR 0044). */
  @property({ type: Boolean }) diagnostics = false;
  /** UI language for the whole page. */
  @property() locale: Locale = DEFAULT_LOCALE;
  /** Colour theme; reflected so the theme tokens apply to this subtree. */
  @property({ reflect: true, attribute: 'data-lxs-theme' }) theme: Theme = 'dark';
  @property({ type: Boolean, reflect: true, attribute: 'library-collapsed' }) libraryCollapsed =
    false;
  @property({ type: Boolean, reflect: true, attribute: 'inspector-collapsed' }) inspectorCollapsed =
    false;

  @state() private selection: readonly string[] = [];
  @state() private helpOpen = false;
  /** A short message over the viewport, e.g. after opening a file. */
  @state() private notice: Notice | null = null;
  /** Whether New's template dialog is open. */
  @state() private newOpen = false;
  #autosaveTimer: number | undefined;
  /** Whether autosaving has failed, so it's reported once. */
  #autosaveFailed = false;
  @state() private scene: Scene | undefined;
  /** Which handle the selection shows: arrows to move it, or the aim handle. */
  @state() private tool: EditTool = 'move';
  /** Whether drags snap to the grid and line up with other luminaires. */
  @state() private snapping = true;
  @state() private renderMode: RenderMode = 'realistic';
  @state() private exposureEv = 0;
  @state() private view: ViewName = 'perspective';
  /** Narrow layout: the inspector is a sheet over the viewport. */
  @state() private narrow = false;
  @state() private sheetOpen = false;
  readonly #narrowQuery = window.matchMedia(NARROW_LAYOUT);
  /** Phone layout (reflected as the `phone` attribute for styling). */
  @state() private phone = false;
  @state() private phoneTab: PhoneTab | null = null;
  @state() private sheetFull = false;
  /** Whether the open phone sheet was opened by selecting, so clearing the selection closes it. */
  #sheetOpenedBySelection = false;
  readonly #phoneQuery = window.matchMedia(PHONE_LAYOUT);
  /** Landscape phone (reflected as the `landscape` attribute). */
  @state() private landscape = false;
  readonly #landscapeQuery = window.matchMedia(LANDSCAPE);

  @query('lxs-viewport') private viewport!: LxsViewport;
  #unsubscribe: (() => void) | undefined;

  override render() {
    return html`${this.phone ? this.#renderPhone() : this.#renderDesktop()}
      <lxs-new-scene
        .open=${this.newOpen}
        .templates=${this.catalog.templates ?? []}
        @lxs-template-pick=${this.#onTemplatePick}
        @lxs-new-scene-close=${() => (this.newOpen = false)}
      ></lxs-new-scene>
      <lxs-help
        .open=${this.helpOpen}
        .iesImport=${this.iesImport}
        manual-url=${this.manualUrls[this.locale] ?? ''}
        @lxs-help-close=${this.#onHelpClose}
      ></lxs-help>`;
  }

  #renderDesktop() {
    const total = this.scene?.luminaires.length ?? 0;
    const selected = this.selection.length;
    return html`
      ${this.#topBar(false)}
      <lxs-library
        .display=${this.catalog}
        .products=${this.simulator?.catalog}
        .scene=${this.scene}
        .selection=${this.selection}
        .collapsed=${this.libraryCollapsed}
        .iesImport=${this.iesImport}
        @lxs-add-product=${this.#onAddProduct}
        @lxs-add-furniture=${this.#onAddFurniture}
        @lxs-select=${this.#onSelect}
        @lxs-collapse-request=${({ detail }: CustomEvent<{ collapsed: boolean }>) =>
          (this.libraryCollapsed = detail.collapsed)}
      ></lxs-library>
      <div class="stage">${this.#viewport()} ${this.#controls('overlay')} ${this.#notice()}</div>
      ${this.#inspector(this.narrow)}
      <footer>
        <span>${msg(str`Luminaires: ${total}`)}</span>
        <span>${msg(str`Selected: ${selected}`)}</span>
      </footer>
    `;
  }

  #renderPhone() {
    const tabs: TabBarItem[] = [
      { id: 'catalog', label: msg('Catalog'), icon: LayoutGrid },
      { id: 'scene', label: msg('Scene'), icon: Layers },
      { id: 'properties', label: msg('Properties'), icon: SlidersHorizontal },
      { id: 'view', label: msg('View'), icon: Eye },
    ];
    const tab = this.phoneTab;
    return html`
      ${this.#topBar(true)}
      <div class="stage">${this.#viewport()} ${this.#notice()}</div>
      ${
        tab
          ? html`<lxs-sheet
              class="phone-sheet"
              .side=${this.landscape}
              heading=${tabs.find((t) => t.id === tab)?.label ?? ''}
              .expanded=${this.sheetFull}
              @lxs-sheet-expand=${({ detail }: CustomEvent<{ expanded: boolean }>) =>
                (this.sheetFull = detail.expanded)}
              @lxs-sheet-close=${() => this.#openPhoneTab(null)}
            >
              ${this.#phoneSheetContent(tab)}
            </lxs-sheet>`
          : nothing
      }
      <lxs-tab-bar
        .vertical=${this.landscape}
        .tabs=${tabs}
        .active=${tab}
        @lxs-tab-change=${({ detail }: CustomEvent<{ tab: string | null }>) =>
          this.#openPhoneTab(detail.tab as PhoneTab | null)}
      ></lxs-tab-bar>
    `;
  }

  #phoneSheetContent(tab: PhoneTab) {
    switch (tab) {
      case 'catalog':
        return html`<lxs-catalog-panel
          .display=${this.catalog}
          .products=${this.simulator?.catalog}
          .iesImport=${this.iesImport}
          @lxs-add-product=${this.#onAddProduct}
          @lxs-add-furniture=${this.#onAddFurniture}
        ></lxs-catalog-panel>`;
      case 'scene':
        return html`<lxs-scene-panel
          .scene=${this.scene}
          .products=${this.simulator?.catalog}
          .display=${this.catalog}
          .selection=${this.selection}
          @lxs-select=${this.#onSelect}
          @lxs-open-catalog=${() => this.#openPhoneTab('catalog')}
        ></lxs-scene-panel>`;
      case 'properties':
        return this.#inspector(false);
      case 'view':
        return this.#controls('panel');
    }
  }

  #topBar(compact: boolean) {
    return html`<lxs-top-bar
      .simulator=${this.simulator}
      .scene=${this.scene}
      .theme=${this.theme}
      .locale=${this.locale}
      .libraryOpen=${!this.libraryCollapsed}
      .inspectorOpen=${!this.inspectorCollapsed}
      .compact=${compact}
      @lxs-theme-change=${({ detail }: CustomEvent<{ theme: Theme }>) => (this.theme = detail.theme)}
      @lxs-locale-request=${({ detail }: CustomEvent<{ locale: Locale }>) => (this.locale = detail.locale)}
      @lxs-new-request=${() => (this.newOpen = true)}
      @lxs-open-request=${this.#pickFile}
      @lxs-save-request=${this.#save}
      @lxs-screenshot-request=${() => void this.#takeScreenshot()}
      @lxs-help-request=${() => (this.helpOpen = true)}
      @lxs-panel-toggle=${({ detail }: CustomEvent<{ panel: PanelName }>) => this.#togglePanel(detail.panel)}
    >
      <slot name="brand" slot="brand"></slot>
    </lxs-top-bar>`;
  }

  #viewport() {
    return html`<lxs-viewport
      .simulator=${this.simulator}
      .highlighted=${this.selection}
      handle=${this.tool}
      .snapping=${this.snapping}
      .diagnostics=${this.diagnostics}
      .renderMode=${this.renderMode}
      .exposureEv=${this.exposureEv}
      @lxs-pick=${this.#onPick}
      @lxs-move-start=${({ detail }: CustomEvent<MoveStartEvent>) =>
        (this.selection = selectionForMove(this.selection, detail.target.id))}
      @lxs-drop-product=${this.#onDropProduct}
      @lxs-drop-furniture=${this.#onDropFurniture}
      @lxs-drop-file=${({ detail }: CustomEvent<DropFileDetail>) => void this.#open(detail.file)}
    ></lxs-viewport>`;
  }

  #notice() {
    return html`<lxs-notice
      class="notice"
      .notice=${this.notice}
      @lxs-notice-close=${() => (this.notice = null)}
    ></lxs-notice>`;
  }

  /** Asks for a scene file to open, with the browser's file picker. */
  #pickFile = (): void => {
    const input = Object.assign(document.createElement('input'), {
      type: 'file',
      accept: SCENE_FILE_ACCEPT,
    });
    input.addEventListener('change', () => {
      const [file] = input.files ?? [];
      if (file) void this.#open(file);
    });
    input.click();
  };

  async #open(file: File): Promise<void> {
    if (!this.simulator) return;
    this.notice = await openSceneFile(file, this.simulator);
    // Opened (errors leave the scene as it was): frame the new room in the current view.
    if (this.notice.kind !== 'error') this.viewport.setView(this.view);
  }

  /** New: the template replaces the scene as one undo step, framed in the current view. */
  #onTemplatePick = ({ detail }: CustomEvent<TemplatePickDetail>): void => {
    if (!this.simulator) return;
    this.simulator.setScene(detail.scene);
    this.viewport.setView(this.view);
    this.notice = { kind: 'info', text: msg(str`New scene: ${detail.name}.`) };
  };

  /** Autosaves a second after the last change, so a drag is written once, not per move. */
  #scheduleAutosave(): void {
    window.clearTimeout(this.#autosaveTimer);
    this.#autosaveTimer = window.setTimeout(() => this.#writeAutosave(), AUTOSAVE_DELAY_MS);
  }

  #writeAutosave(): void {
    window.clearTimeout(this.#autosaveTimer);
    this.#autosaveTimer = undefined;
    if (!this.scene) return;
    try {
      writeAutosave(this.scene);
    } catch (error) {
      if (!this.#autosaveFailed) this.#logger.error("[ui] Couldn't autosave the scene", error);
      this.#autosaveFailed = true;
    }
  }

  /**
   * Leaving or hiding the page writes a pending autosave now. Phones often
   * hide a page without ever unloading it; writing on any visibility change
   * does no harm.
   */
  #flushAutosave = (): void => {
    if (this.#autosaveTimer !== undefined) this.#writeAutosave();
  };

  #save = (): void => {
    if (this.scene) saveSceneFile(this.scene);
  };

  #controls(variant: 'overlay' | 'panel') {
    return html`<lxs-viewport-controls
      variant=${variant}
      .tool=${this.tool}
      .snapping=${this.snapping}
      .renderMode=${this.renderMode}
      .view=${this.view}
      .exposureEv=${this.exposureEv}
      @lxs-tool-change=${({ detail }: CustomEvent<{ tool: EditTool }>) => (this.tool = detail.tool)}
      @lxs-snapping-change=${({ detail }: CustomEvent<{ snapping: boolean }>) =>
        (this.snapping = detail.snapping)}
      @lxs-render-mode-change=${({ detail }: CustomEvent<{ mode: RenderMode }>) => (this.renderMode = detail.mode)}
      @lxs-exposure-change=${({ detail }: CustomEvent<{ ev: number }>) => (this.exposureEv = detail.ev)}
      @lxs-view-request=${({ detail }: CustomEvent<{ view: ViewName }>) => this.#setView(detail.view)}
      @lxs-frame-request=${() => this.viewport.frame(this.selection)}
    ></lxs-viewport-controls>`;
  }

  #inspector(sheet: boolean) {
    // Only the desktop/tablet inspector takes the grid placement and floating-sheet styles.
    return html`<lxs-inspector
      class=${this.phone ? '' : 'inspector'}
      .simulator=${this.simulator}
      .scene=${this.scene}
      .selection=${this.selection}
      .display=${this.catalog}
      .sheet=${sheet}
      .collapsed=${sheet && !this.sheetOpen}
      @lxs-sheet-toggle=${() => (this.sheetOpen = !this.sheetOpen)}
      @lxs-set-selection=${({ detail }: CustomEvent<SetSelectionDetail>) => (this.selection = detail.ids)}
    ></lxs-inspector>`;
  }

  #openPhoneTab(tab: PhoneTab | null): void {
    this.phoneTab = tab;
    this.#sheetOpenedBySelection = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.#onKeyDown);
    window.addEventListener('pagehide', this.#flushAutosave);
    document.addEventListener('visibilitychange', this.#flushAutosave);
    this.#narrowQuery.addEventListener('change', this.#onNarrowChange);
    this.#phoneQuery.addEventListener('change', this.#onPhoneChange);
    this.#landscapeQuery.addEventListener('change', this.#onLandscapeChange);
    this.narrow = this.#narrowQuery.matches;
    this.phone = this.#phoneQuery.matches;
    this.landscape = this.#landscapeQuery.matches;
  }

  protected override firstUpdated(): void {
    // Marked seen as soon as it's shown: "once" holds even if the page is reloaded before closing it.
    if (this.helpOnStart && !helpSeen()) {
      this.helpOpen = true;
      markHelpSeen();
    }
    // Hosts that set library-collapsed themselves keep their choice.
    if (
      !this.hasAttribute('library-collapsed') &&
      this.clientWidth < AUTO_COLLAPSE_LIBRARY_BELOW_PX
    ) {
      this.libraryCollapsed = true;
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.#onKeyDown);
    window.removeEventListener('pagehide', this.#flushAutosave);
    document.removeEventListener('visibilitychange', this.#flushAutosave);
    this.#flushAutosave();
    this.#narrowQuery.removeEventListener('change', this.#onNarrowChange);
    this.#phoneQuery.removeEventListener('change', this.#onPhoneChange);
    this.#landscapeQuery.removeEventListener('change', this.#onLandscapeChange);
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    // Sheets open when something gets selected and fold away when the selection is cleared.
    const previous = (changed as Map<string, unknown>).get('selection') as
      readonly string[] | undefined;
    const selected = previous?.length === 0 && this.selection.length > 0;
    const cleared = !!previous?.length && this.selection.length === 0;
    if (selected) this.sheetOpen = true;
    if (cleared) this.sheetOpen = false;
    if (this.phone && selected && this.phoneTab === null) {
      this.phoneTab = 'properties';
      this.#sheetOpenedBySelection = true;
    }
    if (this.phone && cleared && this.#sheetOpenedBySelection) this.#openPhoneTab(null);
    const changedState = changed as Map<string, unknown>;
    if (changedState.has('phone') || changedState.has('landscape')) {
      this.toggleAttribute('phone', this.phone);
      this.toggleAttribute('landscape', this.phone && this.landscape);
    }
    if (changed.has('locale'))
      void this.#applyLocale(this.locale, changed.get('locale') !== undefined);
    if (changed.has('simulator')) this.#watch(this.simulator);
  }

  async #applyLocale(locale: Locale, announce: boolean): Promise<void> {
    try {
      await setLocale(locale);
    } catch (error) {
      this.#logger.error(`[ui] Couldn't switch the language to ${locale}`, error);
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

  /** The library's logger, or the console before a simulator is set. */
  get #logger(): Pick<Logger, 'error'> {
    return this.simulator?.logger ?? console;
  }

  #watch(simulator: Simulator | undefined): void {
    this.#unsubscribe?.();
    this.scene = simulator?.scene;
    this.selection = [];
    this.#unsubscribe = simulator?.subscribe((scene) => {
      this.scene = scene;
      this.selection = pruneSelection(this.selection, scene);
      if (this.autosave) this.#scheduleAutosave();
    });
  }

  /** Captures the viewport and, unless a host cancels `lxs-screenshot`, downloads it. */
  async #takeScreenshot(): Promise<void> {
    let png: Blob;
    try {
      png = await this.viewport.screenshot();
    } catch (error) {
      this.#logger.error("[ui] Couldn't take the screenshot", error);
      return;
    }
    // A neutral, translated base name: hosts ship this under their own brand.
    const fileName = datedFileName(msg('scene'), '.png', new Date());
    const event = new CustomEvent<ScreenshotDetail>('lxs-screenshot', {
      detail: { png, fileName },
      cancelable: true,
      bubbles: true,
      composed: true,
    });
    if (this.dispatchEvent(event)) download(png, fileName);
  }

  #togglePanel(panel: PanelName): void {
    if (panel === 'library') this.libraryCollapsed = !this.libraryCollapsed;
    else this.inspectorCollapsed = !this.inspectorCollapsed;
  }

  #setView(view: ViewName): void {
    this.view = view;
    this.viewport.setView(view);
  }

  #onNarrowChange = (event: MediaQueryListEvent): void => {
    this.narrow = event.matches;
  };

  #onPhoneChange = (event: MediaQueryListEvent): void => {
    this.phone = event.matches;
  };

  #onLandscapeChange = (event: MediaQueryListEvent): void => {
    this.landscape = event.matches;
  };

  #onHelpClose = (): void => {
    this.helpOpen = false;
  };

  #onPick = ({ detail }: CustomEvent<PickEvent>): void => {
    // Long press (touch) toggles, like Shift-click.
    const toggle = detail.event.shiftKey || detail.longPress;
    this.#pick(detail.target?.id ?? null, toggle);
  };

  #onSelect = ({ detail }: CustomEvent<SelectDetail>): void => {
    this.#pick(detail.id, detail.toggle);
  };

  #pick(id: string | null, toggle: boolean): void {
    if (this.scene) this.selection = selectionAfterPick(this.selection, id, toggle, this.scene);
  }

  #onAddProduct = ({ detail }: CustomEvent<{ productId: string }>): void => {
    if (!this.simulator) return;
    this.selection = [this.simulator.addLuminaire(detail.productId)];
    // On phones, show the new luminaire's properties instead of staying in the catalog.
    if (this.phone) this.#openPhoneTab('properties');
  };

  #onDropProduct = ({ detail }: CustomEvent<DropProductDetail>): void => {
    if (this.simulator)
      this.selection = [this.simulator.addLuminaire(detail.productId, { at: detail.at })];
  };

  #onAddFurniture = ({ detail }: CustomEvent<{ kind: FurnitureKind }>): void => {
    if (!this.simulator) return;
    this.selection = [this.simulator.addFurniture(detail.kind)];
    if (this.phone) this.#openPhoneTab('properties');
  };

  #onDropFurniture = ({ detail }: CustomEvent<DropFurnitureDetail>): void => {
    if (this.simulator)
      this.selection = [this.simulator.addFurniture(detail.kind, { at: detail.at })];
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    // The help is modal: shortcuts mustn't act on the app behind it, and Esc is its own.
    if (this.helpOpen || this.newOpen || isTyping(event)) return;
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
        return sim?.remove(this.selection);
      case 'duplicate':
        // The copies become the selection.
        if (sim) this.selection = sim.duplicate(this.selection);
        return;
      case 'select-all': {
        // All of the kind selected, luminaires when nothing is.
        if (!this.scene) return;
        const furniture = selectionKind(this.selection, this.scene) === 'furniture';
        this.selection = (furniture ? this.scene.furniture : this.scene.luminaires).map(
          (i) => i.id,
        );
        return;
      }
      case 'deselect':
        this.selection = [];
        return;
      case 'save':
        return this.#save();
      case 'open':
        return this.#pickFile();
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
      case 'tool':
        this.tool = action.tool;
        return;
      case 'view':
        return this.#setView(action.view);
    }
  }
}

/** Detail of `lxs-screenshot`. */
export interface ScreenshotDetail {
  readonly png: Blob;
  /** Suggested file name, e.g. "escena-2026-10-11-1432.png". */
  readonly fileName: string;
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-app': LxsApp;
  }
  interface HTMLElementEventMap {
    'lxs-locale-change': CustomEvent<{ locale: Locale }>;
    'lxs-screenshot': CustomEvent<ScreenshotDetail>;
  }
}

import type { Scene, Simulator } from '@luxstudio/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ChevronDown, ChevronUp } from 'lucide';
import { icon } from './icons';
import { EMPTY_DISPLAY_CATALOG, type DisplayCatalog } from './display-catalog';
import './lxs-furniture-inspector';
import './lxs-luminaire-inspector';
import './lxs-room-inspector';
import { selectionKind, type SelectionKind } from './selection';
import { sharedStyles } from './styles';

/**
 * The right panel: the room when nothing is selected, otherwise the selected
 * luminaires or furniture. In `sheet` mode (narrow screens, where it floats over the
 * viewport) the header toggles it between just the header and the full panel.
 *
 * @fires lxs-sheet-toggle - the header was tapped in sheet mode
 */
@customElement('lxs-inspector')
@localized()
export class LxsInspector extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
        background: var(--lxs-surface-1);
      }
      .body {
        flex: 1;
        overflow-y: auto;
      }
      :host([collapsed]) .body {
        display: none;
      }
      button.panel-header {
        width: 100%;
        border: 0;
        border-bottom: 1px solid var(--lxs-line);
        background: transparent;
        text-align: left;
        cursor: pointer;
      }
      :host([collapsed]) button.panel-header {
        border-bottom: 0;
      }
    `,
  ];

  @property({ attribute: false }) simulator: Simulator | undefined;
  @property({ attribute: false }) scene: Scene | undefined;
  @property({ attribute: false }) selection: readonly string[] = [];
  @property({ attribute: false }) display: DisplayCatalog = EMPTY_DISPLAY_CATALOG;
  /** Floating sheet over the viewport (narrow screens): the header becomes a toggle. */
  @property({ type: Boolean, reflect: true }) sheet = false;
  /** In sheet mode, only the header shows. */
  @property({ type: Boolean, reflect: true }) collapsed = false;

  override render() {
    const kind = this.scene ? selectionKind(this.selection, this.scene) : undefined;
    const heading =
      kind === 'luminaire'
        ? msg('Luminaire')
        : kind === 'furniture'
          ? msg('Furniture')
          : msg('Room');
    return html`
      ${
        this.sheet
          ? html`<button
              class="panel-header"
              type="button"
              aria-expanded=${!this.collapsed}
              @click=${() =>
                this.dispatchEvent(
                  new CustomEvent('lxs-sheet-toggle', { bubbles: true, composed: true }),
                )}
            >
              <h2>${heading}</h2>
              ${icon(this.collapsed ? ChevronUp : ChevronDown)}
            </button>`
          : html`<div class="panel-header" part="header">
              <h2>${heading}</h2>
            </div>`
      }
      <div class="body">${this.#body(kind)}</div>
    `;
  }

  #body(kind: SelectionKind | undefined) {
    switch (kind) {
      case 'luminaire':
        return html`<lxs-luminaire-inspector
          .simulator=${this.simulator}
          .scene=${this.scene}
          .selection=${this.selection}
          .display=${this.display}
        ></lxs-luminaire-inspector>`;
      case 'furniture':
        return html`<lxs-furniture-inspector
          .simulator=${this.simulator}
          .scene=${this.scene}
          .selection=${this.selection}
        ></lxs-furniture-inspector>`;
      default:
        return html`<lxs-room-inspector
          .simulator=${this.simulator}
          .scene=${this.scene}
        ></lxs-room-inspector>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-inspector': LxsInspector;
  }
  interface HTMLElementEventMap {
    'lxs-sheet-toggle': CustomEvent<undefined>;
  }
}

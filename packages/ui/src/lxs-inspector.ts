import type { Scene, Simulator } from '@luxstudio/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ChevronDown, ChevronUp } from 'lucide';
import { icon } from './icons';
import { EMPTY_DISPLAY_CATALOG, type DisplayCatalog } from './display-catalog';
import './lxs-luminaire-inspector';
import './lxs-room-inspector';
import { sharedStyles } from './styles';

/**
 * The right panel: the room when nothing is selected, otherwise the selected
 * luminaires. In `sheet` mode (narrow screens, where it floats over the
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
    const room = this.selection.length === 0;
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
              <h2>${room ? msg('Room') : msg('Luminaire')}</h2>
              ${icon(this.collapsed ? ChevronUp : ChevronDown)}
            </button>`
          : html`<div class="panel-header">
              <h2>${room ? msg('Room') : msg('Luminaire')}</h2>
            </div>`
      }
      <div class="body">
        ${
          room
            ? html`<lxs-room-inspector
                .simulator=${this.simulator}
                .scene=${this.scene}
              ></lxs-room-inspector>`
            : html`<lxs-luminaire-inspector
                .simulator=${this.simulator}
                .scene=${this.scene}
                .selection=${this.selection}
                .display=${this.display}
              ></lxs-luminaire-inspector>`
        }
      </div>
    `;
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

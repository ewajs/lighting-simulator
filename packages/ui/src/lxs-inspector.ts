import type { Scene, Simulator } from '@luxstudio/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EMPTY_DISPLAY_CATALOG, type DisplayCatalog } from './display-catalog';
import './lxs-luminaire-inspector';
import './lxs-room-inspector';
import { sharedStyles } from './styles';

/**
 * The right panel: the room when nothing is selected, otherwise the selected
 * luminaires.
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
    `,
  ];

  @property({ attribute: false }) simulator: Simulator | undefined;
  @property({ attribute: false }) scene: Scene | undefined;
  @property({ attribute: false }) selection: readonly string[] = [];
  @property({ attribute: false }) display: DisplayCatalog = EMPTY_DISPLAY_CATALOG;

  override render() {
    const room = this.selection.length === 0;
    return html`
      <div class="panel-header">
        <h2>${room ? msg('Room') : msg('Luminaire')}</h2>
      </div>
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
}

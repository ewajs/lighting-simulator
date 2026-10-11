import type { Scene, Simulator } from '@lighting-sim/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EMPTY_DISPLAY_CATALOG, type DisplayCatalog } from './display-catalog';
import './lsim-luminaire-inspector';
import './lsim-room-inspector';
import { sharedStyles } from './styles';

/**
 * The right panel: the room when nothing is selected, otherwise the selected
 * luminaires.
 */
@customElement('lsim-inspector')
@localized()
export class LsimInspector extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
        background: var(--lsim-surface-1);
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
            ? html`<lsim-room-inspector
                .simulator=${this.simulator}
                .scene=${this.scene}
              ></lsim-room-inspector>`
            : html`<lsim-luminaire-inspector
                .simulator=${this.simulator}
                .scene=${this.scene}
                .selection=${this.selection}
                .display=${this.display}
              ></lsim-luminaire-inspector>`
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lsim-inspector': LsimInspector;
  }
}

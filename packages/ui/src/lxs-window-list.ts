import { WINDOW_TYPES, type WindowPreset } from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Plus } from 'lucide';
import { formatNumber } from './format';
import { icon, windowIcon } from './icons';
import { windowPresetLabel } from './labels';
import { cardListStyles, sharedStyles } from './styles';

/** dataTransfer type carrying a window preset while a window card is dragged. */
export const WINDOW_DRAG_TYPE = 'application/x-lxs-window';

/** The presets, in the order the list shows them. */
const PRESETS: readonly WindowPreset[] = ['window', 'tall-window', 'skylight'];

/**
 * The window presets (ADR 0078): a window, a tall window and a skylight.
 * Clicking one (or pressing Enter on it) asks to add it; cards can also be
 * dragged into the room, onto the wall they should go in.
 *
 * @fires lxs-add-window - `detail: { preset }`
 */
@customElement('lxs-window-list')
@localized()
export class LxsWindowList extends LitElement {
  static override styles = [sharedStyles, cardListStyles];

  override render() {
    return html`<div class="group-label">${msg('Openings')}</div>
      ${PRESETS.map((preset) => this.#card(preset))}`;
  }

  #card(preset: WindowPreset) {
    const { width, height, sill, surface } = WINDOW_TYPES[preset];
    const size = `${formatNumber(width, 2)} × ${formatNumber(height, 2)} m`;
    const sillText = formatNumber(sill, 2);
    const spec =
      surface === 'ceiling'
        ? msg(str`${size} · in the ceiling`)
        : msg(str`${size} · sill ${sillText} m`);
    return html`<button
      class="card"
      type="button"
      draggable="true"
      title=${msg('Click to add, or drag into the room')}
      @click=${() => this.#add(preset)}
      @dragstart=${(event: DragEvent) => {
        event.dataTransfer?.setData(WINDOW_DRAG_TYPE, preset);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <span class="thumb">${windowIcon(preset)}</span>
      <span style="min-width: 0">
        <div class="name">${windowPresetLabel(preset)}</div>
        <div class="spec">${spec}</div>
      </span>
      <span class="add">${icon(Plus)}</span>
    </button>`;
  }

  #add(preset: WindowPreset): void {
    this.dispatchEvent(
      new CustomEvent('lxs-add-window', { detail: { preset }, bubbles: true, composed: true }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-window-list': LxsWindowList;
  }
  interface HTMLElementEventMap {
    'lxs-add-window': CustomEvent<{ preset: WindowPreset }>;
  }
}

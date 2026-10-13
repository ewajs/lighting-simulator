import { FURNITURE_TYPES, type FurnitureKind } from '@luxstudio/core';
import { localized, msg } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Plus } from 'lucide';
import { formatNumber } from './format';
import { furnitureIcon } from './furniture-icons';
import { icon } from './icons';
import { furnitureLabel } from './labels';
import { sharedStyles } from './styles';

/** dataTransfer type carrying a furniture kind while a furniture card is dragged. */
export const FURNITURE_DRAG_TYPE = 'application/x-lxs-furniture';

/** The pieces by room, in the order the list shows them. */
const GROUPS: readonly { label: () => string; kinds: readonly FurnitureKind[] }[] = [
  { label: () => msg('Living room'), kinds: ['sofa', 'armchair', 'coffee-table', 'tv-unit'] },
  { label: () => msg('Dining'), kinds: ['dining-table', 'chair'] },
  { label: () => msg('Office'), kinds: ['desk', 'office-chair', 'bookcase'] },
  { label: () => msg('Bedroom'), kinds: ['bed'] },
  { label: () => msg('Kitchen'), kinds: ['kitchen-island'] },
  { label: () => msg('Display and decor'), kinds: ['display-plinth', 'plant', 'artwork'] },
];

/**
 * The built-in furniture, by room (ADR 0047). Clicking a piece (or pressing
 * Enter on it) asks to add it; cards can also be dragged into the viewport.
 *
 * @fires lxs-add-furniture - `detail: { kind }`
 */
@customElement('lxs-furniture-list')
@localized()
export class LxsFurnitureList extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        overflow-y: auto;
        padding: 0 var(--lxs-sp-2) var(--lxs-sp-3);
      }
      .card {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--lxs-sp-3);
        width: 100%;
        padding: var(--lxs-sp-2);
        border: 1px solid transparent;
        border-radius: var(--lxs-r-md);
        background: transparent;
        text-align: left;
        cursor: grab;
      }
      .card:hover {
        background: var(--lxs-surface-2);
        border-color: var(--lxs-line);
      }
      .thumb {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-md);
        background: var(--lxs-surface-2);
        color: var(--lxs-text-muted);
      }
      .thumb .icon {
        width: 24px;
        height: 24px;
      }
      .name {
        font-weight: 600;
        font-size: var(--lxs-fs-sm);
      }
      .spec {
        color: var(--lxs-text-faint);
        font-size: var(--lxs-fs-xs);
        font-variant-numeric: tabular-nums;
      }
      .add {
        opacity: 0;
        color: var(--lxs-text-muted);
      }
      .card:hover .add,
      .card:focus-visible .add {
        opacity: 1;
      }
      @media (hover: none) {
        .add {
          opacity: 1;
        }
      }
    `,
  ];

  override render() {
    return GROUPS.map(
      ({ label, kinds }) =>
        html`<div class="group-label">${label()}</div>
          ${kinds.map((kind) => this.#card(kind))}`,
    );
  }

  #card(kind: FurnitureKind) {
    const { width, depth, height } = FURNITURE_TYPES[kind].size;
    // Wall pieces are described by their face; floor pieces by footprint and height.
    const spec = FURNITURE_TYPES[kind].onWall
      ? `${formatNumber(width, 2)} × ${formatNumber(height, 2)} m`
      : `${formatNumber(width, 2)} × ${formatNumber(depth, 2)} × ${formatNumber(height, 2)} m`;
    return html`<button
      class="card"
      type="button"
      draggable="true"
      title=${msg('Click to add, or drag into the room')}
      @click=${() => this.#add(kind)}
      @dragstart=${(event: DragEvent) => {
        event.dataTransfer?.setData(FURNITURE_DRAG_TYPE, kind);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <span class="thumb">${furnitureIcon(kind)}</span>
      <span style="min-width: 0">
        <div class="name">${furnitureLabel(kind)}</div>
        <div class="spec">${spec}</div>
      </span>
      <span class="add">${icon(Plus)}</span>
    </button>`;
  }

  #add(kind: FurnitureKind): void {
    this.dispatchEvent(
      new CustomEvent('lxs-add-furniture', { detail: { kind }, bubbles: true, composed: true }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-furniture-list': LxsFurnitureList;
  }
  interface HTMLElementEventMap {
    'lxs-add-furniture': CustomEvent<{ kind: FurnitureKind }>;
  }
}

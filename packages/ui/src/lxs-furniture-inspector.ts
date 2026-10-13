import {
  FINISHES,
  FURNITURE_TYPES,
  MAX_SIZE_SHARE,
  MIN_SIZE_SHARE,
  type FinishName,
  type Furniture,
  type FurnitureFinish,
  type FurnitureSize,
  type Scene,
  type Simulator,
} from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Copy, Layers, Trash } from 'lucide';
import type { FieldChange } from './field-change';
import { furnitureIcon } from './furniture-icons';
import { icon } from './icons';
import { finishLabel, finishPartLabels, furnitureLabel, furnitureNames } from './labels';
import type { SetSelectionDetail } from './lxs-luminaire-inspector';
import './lxs-number-field';
import { inspectorStyles, sharedStyles } from './styles';

/** Step of the size and position fields, in m. */
const LENGTH_STEP = 0.05;
/** Step of the rotation field, in degrees: right angles in a few presses. */
const ROTATION_STEP_DEG = 15;

/**
 * Edits the selected furniture (ADR 0047): size, place, rotation and finishes
 * for one piece; duplicate and delete for several. Edits go straight to the
 * Simulator; after duplicating, it asks the host to select the copies.
 *
 * @fires lxs-set-selection - `detail: SetSelectionDetail`
 */
@customElement('lxs-furniture-inspector')
@localized()
export class LxsFurnitureInspector extends LitElement {
  static override styles = [
    sharedStyles,
    inspectorStyles,
    css`
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--lxs-sp-1);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: var(--lxs-chip-h);
        padding: 0 var(--lxs-sp-2);
        border: 1px solid var(--lxs-line);
        border-radius: calc(var(--lxs-chip-h) / 2);
        background: transparent;
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-xs);
        cursor: pointer;
      }
      .chip:hover {
        color: var(--lxs-text);
        border-color: var(--lxs-line-strong);
      }
      .chip[aria-checked='true'] {
        border-color: var(--lxs-accent);
        color: var(--lxs-text);
      }
      .dot {
        width: 10px;
        height: 10px;
        border: 1px solid var(--lxs-line-strong);
        border-radius: 50%;
      }
      .part {
        display: grid;
        gap: var(--lxs-sp-2);
      }
      .part-label {
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-sm);
      }
    `,
  ];

  @property({ attribute: false }) simulator: Simulator | undefined;
  @property({ attribute: false }) scene: Scene | undefined;
  @property({ attribute: false }) selection: readonly string[] = [];

  override render() {
    const selected = this.scene?.furniture.filter((f) => this.selection.includes(f.id)) ?? [];
    const [first] = selected;
    if (!first) return '';
    return selected.length === 1 ? this.#single(first) : this.#many(selected);
  }

  #single(piece: Furniture) {
    const type = FURNITURE_TYPES[piece.kind];
    const { room } = this.scene!;
    const update = (
      patch: Parameters<Simulator['updateFurniture']>[1],
      { mergeKey }: FieldChange,
    ) => this.simulator?.updateFurniture(piece.id, patch, { mergeKey });
    const size = (key: keyof FurnitureSize, label: string) =>
      html`<lxs-number-field
        label=${label}
        unit="m"
        .value=${piece.size[key]}
        .step=${LENGTH_STEP}
        .min=${type.size[key] * MIN_SIZE_SHARE}
        .max=${type.size[key] * MAX_SIZE_SHARE}
        @lxs-change=${({ detail }: CustomEvent<FieldChange>) =>
          update({ size: { [key]: detail.value } }, detail)}
      ></lxs-number-field>`;
    const axis = (key: 'x' | 'y' | 'z', label: string, min: number, max: number) =>
      html`<lxs-number-field
        label=${label}
        unit="m"
        .value=${piece.position[key]}
        .step=${LENGTH_STEP}
        .min=${min}
        .max=${max}
        @lxs-change=${({ detail }: CustomEvent<FieldChange>) =>
          update({ position: { ...piece.position, [key]: detail.value } }, detail)}
      ></lxs-number-field>`;
    const parts = finishPartLabels(piece.kind);

    return html`
      <div class="entity">
        <span class="thumb">${furnitureIcon(piece.kind)}</span>
        <div>
          <div class="title">${furnitureNames(this.scene!).get(piece.id)}</div>
          <div class="sub">${furnitureLabel(piece.kind)}</div>
        </div>
      </div>
      ${this.#actions([piece])}
      <section>
        <h3>${msg('Size')}</h3>
        <div class="grid-3">
          ${size('width', msg('Width'))} ${type.onWall ? '' : size('depth', msg('Depth'))}
          ${size('height', msg('Height'))}
        </div>
      </section>
      <section>
        <h3>${msg('Position')}</h3>
        <div class="grid-3">
          ${axis('x', 'X', -room.width / 2, room.width / 2)}
          ${type.onWall ? axis('y', msg('Height'), 0, room.height) : ''}
          ${axis('z', 'Z', -room.depth / 2, room.depth / 2)}
          ${
            type.onWall
              ? ''
              : html`<lxs-number-field
                  label=${msg('Rotation')}
                  unit="°"
                  .value=${piece.rotationDeg}
                  .step=${ROTATION_STEP_DEG}
                  .min=${-180}
                  .max=${180}
                  .decimals=${0}
                  @lxs-change=${({ detail }: CustomEvent<FieldChange>) =>
                    update({ rotationDeg: detail.value }, detail)}
                ></lxs-number-field>`
          }
        </div>
      </section>
      ${
        type.mainFinishes.length + type.accentFinishes.length > 0
          ? html`<section>
              <h3>${msg('Finish')}</h3>
              ${this.#finishes(piece, 'main', parts.main, type.mainFinishes)}
              ${this.#finishes(piece, 'accent', parts.accent, type.accentFinishes)}
            </section>`
          : ''
      }
    `;
  }

  /** Chips for the finishes offered for one part; nothing when it takes none. */
  #finishes(
    piece: Furniture,
    part: keyof FurnitureFinish,
    label: string,
    offered: readonly FinishName[],
  ) {
    if (offered.length === 0) return '';
    return html`<div class="part">
      <span class="part-label" id="part-${part}">${label}</span>
      <div class="chips" role="radiogroup" aria-labelledby="part-${part}">
        ${offered.map(
          (finish) =>
            html`<button
              class="chip"
              type="button"
              role="radio"
              aria-checked=${piece.finish[part] === finish}
              @click=${() =>
                this.simulator?.updateFurniture(piece.id, { finish: { [part]: finish } })}
            >
              <span class="dot" style="background: ${FINISHES[finish].color}"></span
              >${finishLabel(finish)}
            </button>`,
        )}
      </div>
    </div>`;
  }

  #many(selected: readonly Furniture[]) {
    const kinds = [...new Set(selected.map((piece) => furnitureLabel(piece.kind)))].join(', ');
    return html`
      <div class="entity">
        <span class="thumb">${icon(Layers)}</span>
        <div>
          <div class="title">${msg(str`${selected.length} pieces selected`)}</div>
          <div class="sub">${kinds}</div>
        </div>
      </div>
      ${this.#actions(selected)}
    `;
  }

  /** Duplicate and delete for the given pieces; each is one undo step. */
  #actions(pieces: readonly Furniture[]) {
    const ids = pieces.map((piece) => piece.id);
    const button = (label: string, content: unknown, onClick: () => void, danger = false) =>
      html`<button
        class="icon-btn ${danger ? 'danger' : ''}"
        type="button"
        aria-label=${label}
        title=${label}
        @click=${onClick}
      >
        ${content}
      </button>`;
    return html`<div class="actions">
      ${button(msg('Duplicate'), icon(Copy), () => {
        const copies = this.simulator?.duplicate(ids) ?? [];
        this.dispatchEvent(
          new CustomEvent<SetSelectionDetail>('lxs-set-selection', {
            detail: { ids: copies },
            bubbles: true,
            composed: true,
          }),
        );
      })}
      <span class="spacer"></span>
      ${button(msg('Delete'), icon(Trash), () => this.simulator?.remove(ids), true)}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-furniture-inspector': LxsFurnitureInspector;
  }
}

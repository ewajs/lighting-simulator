import {
  COVERINGS,
  GLAZINGS,
  MIN_WINDOW_SIDE_M,
  WINDOW_SURFACES,
  WINDOW_TYPES,
  type RoomWindow,
  type Scene,
  type Simulator,
  type WindowPatch,
  type WindowSurface,
} from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Copy, Layers, Trash } from 'lucide';
import type { FieldChange } from './field-change';
import { icon, iconPresetFor, windowIcon } from './icons';
import { coveringLabel, glazingLabel, surfaceLabel, windowNames } from './labels';
import type { SetSelectionDetail } from './lxs-luminaire-inspector';
import './lxs-number-field';
import { inspectorStyles, sharedStyles } from './styles';

/** Step of the size and position fields, in m. */
const LENGTH_STEP = 0.05;

/**
 * Edits the selected windows (ADR 0078): the surface, size, place, glass and
 * covering of one; duplicate and delete for several. Edits go straight to the
 * Simulator, which keeps each window on its surface; after duplicating, it
 * asks the host to select the copies.
 *
 * @fires lxs-set-selection - `detail: SetSelectionDetail`
 */
@customElement('lxs-window-inspector')
@localized()
export class LxsWindowInspector extends LitElement {
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
    const selected = this.scene?.windows.filter((w) => this.selection.includes(w.id)) ?? [];
    const [first] = selected;
    if (!first) return '';
    return selected.length === 1 ? this.#single(first) : this.#many(selected);
  }

  #single(window: RoomWindow) {
    const { room } = this.scene!;
    const inCeiling = window.surface === 'ceiling';
    const update = (patch: WindowPatch, { mergeKey }: FieldChange) =>
      this.simulator?.updateWindow(window.id, patch, { mergeKey });
    const length = (
      label: string,
      value: number,
      [min, max]: readonly [number, number],
      set: (v: number) => WindowPatch,
    ) =>
      html`<lxs-number-field
        label=${label}
        unit="m"
        .value=${value}
        .step=${LENGTH_STEP}
        .min=${min}
        .max=${max}
        @lxs-change=${({ detail }: CustomEvent<FieldChange>) => update(set(detail.value), detail)}
      ></lxs-number-field>`;
    const at = (key: 'x' | 'z', label: string, half: number) =>
      length(label, window.position[key], [-half, half], (value) => ({
        position: { ...window.position, [key]: value },
      }));
    const sill = window.position.y - window.height / 2;
    // Along a wall, its centre moves on x or z, whichever the wall runs along.
    const along = window.surface === 'wall-x-' || window.surface === 'wall-x+' ? 'z' : 'x';
    const size = (key: 'width' | 'height', label: string) =>
      html`<lxs-number-field
        label=${label}
        unit="m"
        .value=${window[key]}
        .step=${LENGTH_STEP}
        .min=${MIN_WINDOW_SIDE_M}
        .max=${Math.max(room.width, room.depth, room.height)}
        @lxs-change=${({ detail }: CustomEvent<FieldChange>) => {
          // On a wall, a taller window keeps its sill: it grows upward.
          const keepSill =
            key === 'height' && !inCeiling
              ? { position: { ...window.position, y: sill + detail.value / 2 } }
              : {};
          update({ [key]: detail.value, ...keepSill }, detail);
        }}
      ></lxs-number-field>`;

    return html`
      <div class="entity">
        <span class="thumb">${windowIcon(iconPresetFor(window.surface))}</span>
        <div>
          <div class="title">${windowNames(this.scene!).get(window.id)}</div>
          <div class="sub">${surfaceLabel(window.surface)}</div>
        </div>
      </div>
      ${this.#actions([window])}
      <section>
        <h3>${msg('Size')}</h3>
        <div class="grid-3">
          ${size('width', msg('Width'))} ${size('height', inCeiling ? msg('Depth') : msg('Height'))}
        </div>
      </section>
      <section>
        <h3>${msg('Position')}</h3>
        ${this.#chips(
          'surface',
          msg('Surface'),
          WINDOW_SURFACES,
          window.surface,
          surfaceLabel,
          (surface) => this.#moveTo(window, surface),
        )}
        <div class="grid-3">
          ${
            inCeiling
              ? html`${at('x', 'X', room.width / 2)} ${at('z', 'Z', room.depth / 2)}`
              : html`${at(along, along.toUpperCase(), (along === 'x' ? room.width : room.depth) / 2)}
                ${length(msg('Sill'), sill, [0, room.height], (value) => ({
                  position: { ...window.position, y: value + window.height / 2 },
                }))}`
          }
        </div>
      </section>
      <section>
        <h3>${msg('Glass and covering')}</h3>
        ${this.#chips(
          'glazing',
          msg('Glass'),
          Object.keys(GLAZINGS) as (keyof typeof GLAZINGS)[],
          window.glazing,
          glazingLabel,
          (glazing) => this.simulator?.updateWindow(window.id, { glazing }),
        )}
        ${this.#chips(
          'covering',
          msg('Covering'),
          Object.keys(COVERINGS) as (keyof typeof COVERINGS)[],
          window.covering,
          coveringLabel,
          (covering) => this.simulator?.updateWindow(window.id, { covering }),
        )}
      </section>
    `;
  }

  /**
   * Moves a window to another surface, centred along it. Onto a wall it keeps
   * its sill, or from the ceiling takes the usual window's.
   */
  #moveTo(window: RoomWindow, surface: WindowSurface): void {
    const sill =
      window.surface === 'ceiling'
        ? WINDOW_TYPES.window.sill
        : window.position.y - window.height / 2;
    const y = surface === 'ceiling' ? 0 : sill + window.height / 2;
    this.simulator?.updateWindow(window.id, { surface, position: { x: 0, y, z: 0 } });
  }

  /** A labelled row of radio chips, one per option. */
  #chips<T extends string>(
    id: string,
    label: string,
    options: readonly T[],
    current: T,
    optionLabel: (option: T) => string,
    choose: (option: T) => void,
  ) {
    return html`<div class="part">
      <span class="part-label" id="part-${id}">${label}</span>
      <div class="chips" role="radiogroup" aria-labelledby="part-${id}">
        ${options.map(
          (option) =>
            html`<button
              class="chip"
              type="button"
              role="radio"
              aria-checked=${current === option}
              @click=${() => choose(option)}
            >
              ${optionLabel(option)}
            </button>`,
        )}
      </div>
    </div>`;
  }

  #many(selected: readonly RoomWindow[]) {
    return html`
      <div class="entity">
        <span class="thumb">${icon(Layers)}</span>
        <div>
          <div class="title">${msg(str`${selected.length} windows selected`)}</div>
        </div>
      </div>
      ${this.#actions(selected)}
    `;
  }

  /** Duplicate and delete for the given windows; each is one undo step. */
  #actions(windows: readonly RoomWindow[]) {
    const ids = windows.map((window) => window.id);
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
    'lxs-window-inspector': LxsWindowInspector;
  }
}

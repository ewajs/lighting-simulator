import type { Luminaire, MountType, Scene, Simulator } from '@lighting-sim/core';
import { localized, msg, str } from '@lit/localize';
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Copy, Layers, Power, Trash } from 'lucide';
import { EMPTY_DISPLAY_CATALOG, luminaireNames, type DisplayCatalog } from './display-catalog';
import { newMergeKey, type FieldChange } from './field-change';
import { formatKelvin, formatNumber } from './format';
import { icon, mountIcon } from './icons';
import './lsim-number-field';
import './lsim-slider-field';
import { inspectorStyles, sharedStyles } from './styles';

/** Colour temperature range offered by the slider, in K. */
const CCT_RANGE = { min: 2200, max: 6500, step: 100 };
/** Mounts whose height is fixed by where they're installed. */
const FIXED_HEIGHT: readonly MountType[] = ['recessed', 'track', 'floor', 'table'];
/** Mounts with an adjustable head. */
const AIMABLE: readonly MountType[] = ['recessed', 'track'];

/** Detail of `lsim-set-selection`: replace the host's selection with these ids. */
export interface SetSelectionDetail {
  readonly ids: readonly string[];
}

const mountLabel = (mount: MountType): string =>
  ({
    recessed: msg('Recessed'),
    pendant: msg('Pendant'),
    track: msg('Track'),
    wall: msg('Wall'),
    floor: msg('Floor lamp'),
    table: msg('Table lamp'),
  })[mount];

const percent = (value: number) => `${formatNumber(value * 100)}%`;

/**
 * Edits the selected luminaires: everything for one, shared fields for several.
 * Edits go straight to the Simulator; after duplicating, it asks the host to
 * select the copies.
 *
 * @fires lsim-set-selection - `detail: SetSelectionDetail`
 */
@customElement('lsim-luminaire-inspector')
@localized()
export class LsimLuminaireInspector extends LitElement {
  static override styles = [sharedStyles, inspectorStyles];

  @property({ attribute: false }) simulator: Simulator | undefined;
  @property({ attribute: false }) scene: Scene | undefined;
  @property({ attribute: false }) selection: readonly string[] = [];
  @property({ attribute: false }) display: DisplayCatalog = EMPTY_DISPLAY_CATALOG;

  override render() {
    const selected = this.scene?.luminaires.filter((l) => this.selection.includes(l.id)) ?? [];
    const [first] = selected;
    if (!first) return '';
    return selected.length === 1 ? this.#single(first) : this.#many(selected);
  }

  #single(luminaire: Luminaire) {
    const product = this.simulator?.catalog.get(luminaire.productId);
    const item = this.display.items.find((i) => i.productId === luminaire.productId);
    const name = luminaireNames(this.scene!, this.display).get(luminaire.id);
    const { room } = this.scene!;
    const update = (patch: Partial<Luminaire>, { mergeKey }: FieldChange) =>
      this.simulator?.updateLuminaire(luminaire.id, patch, { mergeKey });
    const axis = (
      key: 'x' | 'y' | 'z',
      label: string,
      min: number,
      max: number,
      disabled = false,
    ) =>
      html`<lsim-number-field
        label=${label}
        unit="m"
        .value=${luminaire.position[key]}
        .step=${0.05}
        .min=${min}
        .max=${max}
        ?disabled=${disabled}
        @lsim-change=${({ detail }: CustomEvent<FieldChange>) =>
          update({ position: { ...luminaire.position, [key]: detail.value } }, detail)}
      ></lsim-number-field>`;

    return html`
      <div class="entity">
        <span class="thumb">${mountIcon(product?.mount)}</span>
        <div>
          <div class="title">${name}</div>
          <div class="sub">${item?.name ?? luminaire.productId}</div>
          ${product ? html`<div class="sub">${mountLabel(product.mount)}</div>` : ''}
        </div>
      </div>
      ${this.#actions([luminaire])}
      <section>
        <h3>${msg('Output')}</h3>
        <lsim-slider-field
          label=${msg('Dimming')}
          .value=${luminaire.dimming}
          .format=${percent}
          @lsim-change=${({ detail }: CustomEvent<FieldChange>) => update({ dimming: detail.value }, detail)}
        ></lsim-slider-field>
        <lsim-slider-field
          label=${msg('Colour temperature')}
          variant="cct"
          .value=${luminaire.cct}
          .min=${CCT_RANGE.min}
          .max=${CCT_RANGE.max}
          .step=${CCT_RANGE.step}
          .format=${formatKelvin}
          @lsim-change=${({ detail }: CustomEvent<FieldChange>) => update({ cct: detail.value }, detail)}
        ></lsim-slider-field>
      </section>
      <section>
        <h3>${msg('Position')}</h3>
        <div class="grid-3">
          ${axis('x', 'X', -room.width / 2, room.width / 2)}
          ${axis('y', msg('Height'), 0, room.height, !product || FIXED_HEIGHT.includes(product.mount))}
          ${axis('z', 'Z', -room.depth / 2, room.depth / 2)}
        </div>
      </section>
      ${
        product && AIMABLE.includes(product.mount)
          ? html`<section>
              <h3>${msg('Aim')}</h3>
              <div class="grid-2">
                <lsim-number-field
                  label=${msg('Tilt')}
                  unit="°"
                  .value=${luminaire.aim.tiltDeg}
                  .step=${5}
                  .min=${0}
                  .max=${90}
                  .decimals=${0}
                  @lsim-change=${({ detail }: CustomEvent<FieldChange>) =>
                    update({ aim: { ...luminaire.aim, tiltDeg: detail.value } }, detail)}
                ></lsim-number-field>
                <lsim-number-field
                  label=${msg('Pan')}
                  unit="°"
                  .value=${luminaire.aim.panDeg}
                  .step=${5}
                  .min=${-180}
                  .max=${180}
                  .decimals=${0}
                  @lsim-change=${({ detail }: CustomEvent<FieldChange>) =>
                    update({ aim: { ...luminaire.aim, panDeg: detail.value } }, detail)}
                ></lsim-number-field>
              </div>
            </section>`
          : ''
      }
      ${
        product
          ? html`<section>
              <h3>${msg('Product')}</h3>
              <div class="spec">
                <span>${msg('Power')}</span><span>${formatNumber(product.power, 1)} W</span>
              </div>
              <div class="spec">
                <span>${msg('Luminous flux')}</span><span>${formatNumber(product.flux)} lm</span>
              </div>
              <div class="spec">
                <span>${msg('Nominal CCT')}</span><span>${formatKelvin(product.cct)}</span>
              </div>
              <div class="spec">
                <span>${msg('Beam angle')}</span><span>${formatNumber(product.beamDeg)}°</span>
              </div>
            </section>`
          : ''
      }
    `;
  }

  #many(selected: readonly Luminaire[]) {
    const names = [
      ...new Set(
        selected.map(
          (l) => this.display.items.find((i) => i.productId === l.productId)?.name ?? l.productId,
        ),
      ),
    ].join(', ');
    return html`
      <div class="entity">
        <span class="thumb">${icon(Layers)}</span>
        <div>
          <div class="title">${msg(str`${selected.length} luminaires selected`)}</div>
          <div class="sub">${names}</div>
        </div>
      </div>
      ${this.#actions(selected)}
      <section>
        <h3>${msg('Output')}</h3>
        <lsim-slider-field
          label=${msg('Dimming (all)')}
          .value=${selected[0]!.dimming}
          .format=${percent}
          @lsim-change=${({ detail }: CustomEvent<FieldChange>) => {
            for (const { id } of selected) {
              this.simulator?.updateLuminaire(
                id,
                { dimming: detail.value },
                { mergeKey: detail.mergeKey },
              );
            }
          }}
        ></lsim-slider-field>
      </section>
    `;
  }

  /** On/off, duplicate and delete for the given luminaires; each is one undo step. */
  #actions(luminaires: readonly Luminaire[]) {
    const ids = luminaires.map((l) => l.id);
    const anyOn = luminaires.some((l) => l.on);
    const button = (
      label: string,
      content: unknown,
      onClick: () => void,
      { pressed = false, danger = false } = {},
    ) =>
      html`<button
        class="icon-btn ${danger ? 'danger' : ''}"
        type="button"
        aria-label=${label}
        title=${label}
        aria-pressed=${String(pressed)}
        @click=${onClick}
      >
        ${content}
      </button>`;
    return html`<div class="actions">
      ${button(
        anyOn ? msg('Turn off') : msg('Turn on'),
        icon(Power),
        () => {
          const mergeKey = newMergeKey();
          for (const id of ids) this.simulator?.updateLuminaire(id, { on: !anyOn }, { mergeKey });
        },
        { pressed: anyOn },
      )}
      ${button(msg('Duplicate'), icon(Copy), () => {
        const copies = this.simulator?.duplicateLuminaires(ids) ?? [];
        this.dispatchEvent(
          new CustomEvent<SetSelectionDetail>('lsim-set-selection', {
            detail: { ids: copies },
            bubbles: true,
            composed: true,
          }),
        );
      })}
      <span class="spacer"></span>
      ${button(msg('Delete'), icon(Trash), () => this.simulator?.removeLuminaires(ids), { danger: true })}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lsim-luminaire-inspector': LsimLuminaireInspector;
  }
  interface HTMLElementEventMap {
    'lsim-set-selection': CustomEvent<SetSelectionDetail>;
  }
}

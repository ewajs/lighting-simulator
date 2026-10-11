import type { Scene, Simulator, SurfaceName } from '@lighting-sim/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Box } from 'lucide';
import { newMergeKey, type FieldChange } from './field-change';
import { formatNumber } from './format';
import { icon } from './icons';
import './lsim-number-field';
import './lsim-slider-field';
import { sharedStyles, inspectorStyles } from './styles';
import { surfacePresets } from './surface-presets';

/** Room dimensions, in m, offered by the fields. */
const ROOM_SIZE_RANGE = { min: 1, max: 30 };
/** Highest reflectance offered; core rejects ρ ≥ 1 (SPEC §6). */
const MAX_REFLECTANCE = 0.95;

/** Edits the room: dimensions and surface finishes. */
@customElement('lsim-room-inspector')
@localized()
export class LsimRoomInspector extends LitElement {
  static override styles = [
    sharedStyles,
    inspectorStyles,
    css`
      .finish {
        display: flex;
        align-items: end;
        gap: var(--lsim-sp-3);
      }
      .finish lsim-slider-field {
        flex: 1;
      }
      .swatch {
        flex: none;
        width: var(--lsim-control-h);
        height: var(--lsim-control-h);
        padding: 0;
        overflow: hidden;
        border: 1px solid var(--lsim-line-strong);
        border-radius: var(--lsim-r-md);
        cursor: pointer;
      }
      .swatch input {
        width: 150%;
        height: 150%;
        margin: -25%;
        border: 0;
        padding: 0;
        cursor: pointer;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--lsim-sp-1);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 24px;
        padding: 0 var(--lsim-sp-2);
        border: 1px solid var(--lsim-line);
        border-radius: 12px;
        background: transparent;
        color: var(--lsim-text-muted);
        font-size: var(--lsim-fs-xs);
        cursor: pointer;
      }
      .chip:hover {
        color: var(--lsim-text);
        border-color: var(--lsim-line-strong);
      }
      .dot {
        width: 8px;
        height: 8px;
        border: 1px solid var(--lsim-line-strong);
        border-radius: 50%;
      }
    `,
  ];

  /** Used to apply edits. */
  @property({ attribute: false }) simulator: Simulator | undefined;
  /** What to show; the host passes each new scene so the view updates. */
  @property({ attribute: false }) scene: Scene | undefined;

  /** One merge key per colour-picker session, kept across re-renders. */
  readonly #colorKeys = new Map<SurfaceName, string>();

  override render() {
    if (!this.scene) return '';
    const { width, depth, height } = this.scene.room;
    const area = formatNumber(width * depth, 1);
    const volume = formatNumber(width * depth * height, 1);
    return html`
      <div class="entity">
        <span class="thumb">${icon(Box)}</span>
        <div>
          <div class="title">${msg('Rectangular room')}</div>
          <div class="sub">${msg(str`Area ${area} m² · Volume ${volume} m³`)}</div>
        </div>
      </div>
      <section>
        <h3>${msg('Dimensions')}</h3>
        <div class="grid-3">
          ${this.#size('width', msg('Width'), width)} ${this.#size('depth', msg('Depth'), depth)}
          ${this.#size('height', msg('Height'), height)}
        </div>
      </section>
      ${this.#surface('floor', msg('Floor'))} ${this.#surface('walls', msg('Walls'))}
      ${this.#surface('ceiling', msg('Ceiling'))}
      <p class="hint">${msg('Select a luminaire in the viewport or the Scene list to edit it.')}</p>
    `;
  }

  #size(key: 'width' | 'depth' | 'height', label: string, value: number) {
    return html`<lsim-number-field
      label=${label}
      unit="m"
      .value=${value}
      .min=${ROOM_SIZE_RANGE.min}
      .max=${ROOM_SIZE_RANGE.max}
      @lsim-change=${({ detail }: CustomEvent<FieldChange>) =>
        this.simulator?.setRoomSize({ [key]: detail.value }, { mergeKey: detail.mergeKey })}
    ></lsim-number-field>`;
  }

  #surface(name: SurfaceName, label: string) {
    const surface = this.scene!.room.surfaces[name];
    return html`<section>
      <h3>${label}</h3>
      <div class="finish">
        <span class="swatch">
          <input
            type="color"
            .value=${surface.color}
            aria-label=${msg(str`${label} colour`)}
            @input=${(event: Event) => {
              const mergeKey = this.#colorKeys.get(name) ?? newMergeKey();
              this.#colorKeys.set(name, mergeKey);
              const color = (event.target as HTMLInputElement).value;
              this.simulator?.setSurface(name, { color }, { mergeKey });
            }}
            @change=${() => this.#colorKeys.delete(name)}
          />
        </span>
        <lsim-slider-field
          label=${msg('Reflectance ρ')}
          .value=${surface.reflectance}
          .max=${MAX_REFLECTANCE}
          .format=${(value: number) => `${formatNumber(value * 100)}%`}
          @lsim-change=${({ detail }: CustomEvent<FieldChange>) =>
            this.simulator?.setSurface(
              name,
              { reflectance: detail.value },
              { mergeKey: detail.mergeKey },
            )}
        ></lsim-slider-field>
      </div>
      <div class="chips">
        ${surfacePresets().map(
          (preset) =>
            html`<button
              class="chip"
              type="button"
              title="ρ ${formatNumber(preset.reflectance * 100)}%"
              @click=${() =>
                this.simulator?.setSurface(name, {
                  color: preset.color,
                  reflectance: preset.reflectance,
                })}
            >
              <span class="dot" style="background: ${preset.color}"></span>${preset.name}
            </button>`,
        )}
      </div>
    </section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lsim-room-inspector': LsimRoomInspector;
  }
}

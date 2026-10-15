import type { Scene, Simulator, SurfaceName } from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Box } from 'lucide';
import {
  EMPTY_DISPLAY_CATALOG,
  type DisplayCatalog,
  type SurfaceMaterial,
} from './display-catalog';
import { newMergeKey, type FieldChange } from './field-change';
import { formatNumber } from './format';
import { icon } from './icons';
import './lxs-number-field';
import './lxs-slider-field';
import { sharedStyles, inspectorStyles } from './styles';
import { surfacePresets } from './surface-presets';

/** Room dimensions, in m, offered by the fields. */
const ROOM_SIZE_RANGE = { min: 1, max: 30 };
/** Highest reflectance offered; core rejects ρ ≥ 1 (SPEC §6). */
const MAX_REFLECTANCE = 0.95;

/**
 * Edits the room: dimensions and surface finishes, a colour or one of the
 * host's materials (ADR 0050).
 */
@customElement('lxs-room-inspector')
@localized()
export class LxsRoomInspector extends LitElement {
  static override styles = [
    sharedStyles,
    inspectorStyles,
    css`
      .finish {
        display: flex;
        align-items: end;
        gap: var(--lxs-sp-3);
      }
      .finish lxs-slider-field {
        flex: 1;
      }
      .swatch {
        flex: none;
        width: var(--lxs-control-h);
        height: var(--lxs-control-h);
        padding: 0;
        overflow: hidden;
        border: 1px solid var(--lxs-line-strong);
        border-radius: var(--lxs-r-md);
        cursor: pointer;
      }
      .swatch img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
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
      .chip[aria-pressed='true'] {
        border-color: var(--lxs-accent);
        color: var(--lxs-text);
      }
      .dot {
        width: 8px;
        height: 8px;
        border: 1px solid var(--lxs-line-strong);
        border-radius: 50%;
      }
      .chip img {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        object-fit: cover;
      }
      .chips-label {
        color: var(--lxs-text-faint);
        font-size: var(--lxs-fs-xs);
      }
    `,
  ];

  /** Used to apply edits. */
  @property({ attribute: false }) simulator: Simulator | undefined;
  /** What to show; the host passes each new scene so the view updates. */
  @property({ attribute: false }) scene: Scene | undefined;
  /** The host's display data; its `materials` are offered for the surfaces they suit. */
  @property({ attribute: false }) display: DisplayCatalog = EMPTY_DISPLAY_CATALOG;

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
      <p class="hint">
        ${msg('Select a luminaire or a piece of furniture in the viewport or the Scene list to edit it.')}
      </p>
    `;
  }

  #size(key: 'width' | 'depth' | 'height', label: string, value: number) {
    return html`<lxs-number-field
      label=${label}
      unit="m"
      .value=${value}
      .min=${ROOM_SIZE_RANGE.min}
      .max=${ROOM_SIZE_RANGE.max}
      @lxs-change=${({ detail }: CustomEvent<FieldChange>) =>
        this.simulator?.setRoomSize({ [key]: detail.value }, { mergeKey: detail.mergeKey })}
    ></lxs-number-field>`;
  }

  #surface(name: SurfaceName, label: string) {
    const surface = this.scene!.room.surfaces[name];
    const materials = (this.display.materials ?? []).filter((m) => m.surfaces.includes(name));
    const current = materials.find((m) => m.textureId === surface.texture);
    return html`<section>
      <h3>${label}</h3>
      <div class="finish">
        ${
          surface.texture
            ? html`<span class="swatch" title=${current?.name ?? ''}>
                ${current?.thumbnailUrl ? html`<img src=${current.thumbnailUrl} alt="" />` : ''}
              </span>`
            : this.#colorPicker(name, label, surface.color)
        }
        <lxs-slider-field
          label=${msg('Reflectance ρ')}
          .value=${surface.reflectance}
          .max=${MAX_REFLECTANCE}
          .format=${(value: number) => `${formatNumber(value * 100)}%`}
          @lxs-change=${({ detail }: CustomEvent<FieldChange>) =>
            this.simulator?.setSurface(
              name,
              { reflectance: detail.value },
              { mergeKey: detail.mergeKey },
            )}
        ></lxs-slider-field>
      </div>
      ${materials.length > 0 ? html`<span class="chips-label">${msg('Colour')}</span>` : ''}
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
                  texture: undefined,
                })}
            >
              <span class="dot" style="background: ${preset.color}"></span>${preset.name}
            </button>`,
        )}
      </div>
      ${materials.length > 0 ? this.#materials(name, materials, surface.texture) : ''}
    </section>`;
  }

  /** The materials offered for a surface; picking one sets its texture and typical reflectance. */
  #materials(name: SurfaceName, materials: readonly SurfaceMaterial[], texture?: string) {
    return html`<span class="chips-label">${msg('Material')}</span>
      <div class="chips">
        ${materials.map(
          (material) =>
            html`<button
              class="chip"
              type="button"
              aria-pressed=${material.textureId === texture}
              title="ρ ${formatNumber(material.reflectance * 100)}%"
              @click=${() =>
                this.simulator?.setSurface(name, {
                  texture: material.textureId,
                  reflectance: material.reflectance,
                })}
            >
              ${
                material.thumbnailUrl
                  ? html`<img src=${material.thumbnailUrl} alt="" />`
                  : html`<span class="dot"></span>`
              }${material.name}
            </button>`,
        )}
      </div>`;
  }

  /** The surface's colour, editable while it has no texture. */
  #colorPicker(name: SurfaceName, label: string, color: string) {
    return html`<span class="swatch">
      <input
        type="color"
        .value=${color}
        aria-label=${msg(str`${label} colour`)}
        @input=${(event: Event) => {
          const mergeKey = this.#colorKeys.get(name) ?? newMergeKey();
          this.#colorKeys.set(name, mergeKey);
          const color = (event.target as HTMLInputElement).value;
          this.simulator?.setSurface(name, { color }, { mergeKey });
        }}
        @change=${() => this.#colorKeys.delete(name)}
      />
    </span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-room-inspector': LxsRoomInspector;
  }
}

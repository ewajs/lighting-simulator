import {
  SKY_KINDS,
  sunPosition,
  type Daylight,
  type Scene,
  type Simulator,
  type SkyKind,
} from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { FieldChange } from './field-change';
import { formatHour, formatNumber, monthName } from './format';
import './lxs-number-field';
import './lxs-slider-field';
import { chipStyles, inspectorStyles, sharedStyles } from './styles';

/** The times of day offered as one-click presets, in solar hours. */
const TIME_PRESETS: readonly { label: () => string; hour: number }[] = [
  { label: () => msg('Morning'), hour: 9 },
  { label: () => msg('Noon'), hour: 12 },
  { label: () => msg('Afternoon'), hour: 16 },
];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
/** Days in each month of a 365-day year, to keep the day valid when the month changes. */
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
/** The time slider's step, in hours: a quarter of an hour. */
const HOUR_STEP = 0.25;
/** Step of the north field, in degrees: the eight compass points in a few presses. */
const NORTH_STEP_DEG = 15;

const skyLabel = (sky: SkyKind): string =>
  ({ overcast: msg('Overcast'), clear: msg('Clear, with sun'), night: msg('Night') })[sky];

/**
 * Edits the daylight outside the windows (ADR 0079): the sky, the time of day
 * (solar time: 12 is when the sun is highest), the month, the latitude and
 * which way north is. Edits go straight to the Simulator.
 */
@customElement('lxs-daylight-inspector')
@localized()
export class LxsDaylightInspector extends LitElement {
  static override styles = [
    sharedStyles,
    inspectorStyles,
    chipStyles,
    css`
      /* Laid out as the number fields beside it are. */
      .month {
        display: grid;
        gap: 6px;
        min-width: 0;
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-xs);
      }
      select {
        min-width: 0;
        height: var(--lxs-control-h);
        padding: 0 var(--lxs-sp-2);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-md);
        background: var(--lxs-surface-2);
        color: var(--lxs-text);
        font: inherit;
        font-size: var(--lxs-fs-sm);
      }
      .sun {
        color: var(--lxs-text-faint);
        font-size: var(--lxs-fs-xs);
      }
    `,
  ];

  @property({ attribute: false }) simulator: Simulator | undefined;
  @property({ attribute: false }) scene: Scene | undefined;

  override render() {
    const daylight = this.scene?.daylight;
    if (!daylight) return '';
    const set = (patch: Partial<Daylight>, change?: FieldChange) =>
      this.simulator?.setDaylight(patch, change && { mergeKey: change.mergeKey });
    return html`<section>
      <h3>${msg('Daylight')}</h3>
      ${this.#chips('sky', msg('Sky'), SKY_KINDS, daylight.sky, skyLabel, (sky) => set({ sky }))}
      <div class="part">
        ${this.#chips(
          'time',
          msg('Time of day'),
          TIME_PRESETS.map((preset) => preset.hour),
          daylight.solarHour,
          (hour) => TIME_PRESETS.find((preset) => preset.hour === hour)!.label(),
          (solarHour) => set({ solarHour }),
        )}
        <lxs-slider-field
          label=${msg('Solar time')}
          .value=${daylight.solarHour}
          .min=${0}
          .max=${24}
          .step=${HOUR_STEP}
          .format=${formatHour}
          @lxs-change=${({ detail }: CustomEvent<FieldChange>) =>
            set({ solarHour: detail.value }, detail)}
        ></lxs-slider-field>
        <span class="sun">${this.#sunText(daylight)}</span>
      </div>
      <div class="grid-3">
        <label class="month">
          <span>${msg('Month')}</span>
          <select
            @change=${(event: Event) => {
              const month = Number((event.target as HTMLSelectElement).value);
              set({ month, day: Math.min(daylight.day, MONTH_DAYS[month - 1]!) });
            }}
          >
            ${MONTHS.map(
              (month) =>
                html`<option value=${month} ?selected=${daylight.month === month}>
                  ${monthName(month)}
                </option>`,
            )}
          </select>
        </label>
        <lxs-number-field
          label=${msg('Latitude')}
          unit="°"
          .value=${daylight.latitudeDeg}
          .step=${0.5}
          .min=${-90}
          .max=${90}
          .decimals=${1}
          @lxs-change=${({ detail }: CustomEvent<FieldChange>) =>
            set({ latitudeDeg: detail.value }, detail)}
        ></lxs-number-field>
        <lxs-number-field
          label=${msg('North')}
          unit="°"
          .value=${daylight.northDeg}
          .step=${NORTH_STEP_DEG}
          .min=${-180}
          .max=${180}
          .decimals=${0}
          @lxs-change=${({ detail }: CustomEvent<FieldChange>) =>
            set({ northDeg: detail.value }, detail)}
        ></lxs-number-field>
      </div>
      <p class="hint">
        ${msg('North 0° is behind the back wall; 90° behind the right wall. Southern latitudes are negative.')}
      </p>
    </section>`;
  }

  /** Where the sun is, or that it isn't up, so the settings read as a sky. */
  #sunText(daylight: Daylight): string {
    if (daylight.sky === 'night') return msg('No daylight: only the luminaires light the room.');
    const { altitudeDeg } = sunPosition(daylight);
    if (altitudeDeg <= 0) return msg('The sun is below the horizon: no daylight.');
    const altitude = formatNumber(altitudeDeg);
    return msg(str`The sun is ${altitude}° above the horizon.`);
  }

  /** A labelled row of radio chips, one per option. */
  #chips<T extends string | number>(
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
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-daylight-inspector': LxsDaylightInspector;
  }
}

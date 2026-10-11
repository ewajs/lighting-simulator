import { localized } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { fieldChangeEvent, newMergeKey } from './field-change';
import { fieldStyles } from './field-styles';

/**
 * A labelled range slider with a value readout. Fires continuously while
 * dragging; the whole drag shares one merge key.
 *
 * @fires lxs-change - `detail: FieldChange`
 */
@customElement('lxs-slider-field')
@localized()
export class LxsSliderField extends LitElement {
  static override styles = [
    fieldStyles,
    css`
      /*
       * Fully custom range: Safari ignores accent-color on range inputs, so the
       * track is drawn here with the fill up to --pct (set from the value).
       */
      input {
        --thumb: 14px;
        appearance: none;
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        margin: calc(var(--thumb) / 2) 0;
        border-radius: 3px;
        background: linear-gradient(
          90deg,
          var(--lxs-accent) var(--pct),
          var(--lxs-surface-3) var(--pct)
        );
        cursor: pointer;
      }
      :host([variant='cct']) input {
        background: var(--lxs-cct-gradient);
      }
      input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: var(--thumb);
        height: var(--thumb);
        border-radius: 50%;
        background: var(--lxs-text);
        border: 2px solid var(--lxs-surface-1);
        box-shadow: 0 0 0 1px var(--lxs-line-strong);
      }
      input::-moz-range-thumb {
        width: var(--thumb);
        height: var(--thumb);
        border-radius: 50%;
        background: var(--lxs-text);
        border: 2px solid var(--lxs-surface-1);
      }
      @media (pointer: coarse) {
        input {
          --thumb: 24px;
        }
      }
    `,
  ];

  @property() label = '';
  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 1;
  @property({ type: Number }) step = 0.01;
  /** `cct` draws a warm-to-cool gradient track. */
  @property({ reflect: true }) variant: '' | 'cct' = '';
  /** Turns the value into the readout text. */
  @property({ attribute: false }) format: (value: number) => string = String;

  #mergeKey: string | undefined;

  override render() {
    return html`<label>
      <span class="label"
        ><span>${this.label}</span><span class="readout">${this.format(this.value)}</span></span
      >
      <input
        type="range"
        .min=${String(this.min)}
        .max=${String(this.max)}
        .step=${String(this.step)}
        .value=${String(this.value)}
        style="--pct: ${((this.value - this.min) / (this.max - this.min)) * 100}%"
        aria-label=${this.label}
        @input=${this.#onInput}
        @change=${() => (this.#mergeKey = undefined)}
      />
    </label>`;
  }

  #onInput = (event: Event): void => {
    this.#mergeKey ??= newMergeKey();
    const value = Number((event.target as HTMLInputElement).value);
    this.dispatchEvent(fieldChangeEvent({ value, mergeKey: this.#mergeKey }));
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-slider-field': LxsSliderField;
  }
}

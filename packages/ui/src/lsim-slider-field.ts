import { localized } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { fieldChangeEvent, newMergeKey } from './field-change';
import { fieldStyles } from './field-styles';

/**
 * A labelled range slider with a value readout. Fires continuously while
 * dragging; the whole drag shares one merge key.
 *
 * @fires lsim-change - `detail: FieldChange`
 */
@customElement('lsim-slider-field')
@localized()
export class LsimSliderField extends LitElement {
  static override styles = [
    fieldStyles,
    css`
      input {
        width: 100%;
        margin: 0;
        accent-color: var(--lsim-accent);
        cursor: pointer;
      }
      :host([variant='cct']) input {
        appearance: none;
        height: 6px;
        border-radius: 3px;
        background: var(--lsim-cct-gradient);
      }
      :host([variant='cct']) input::-webkit-slider-thumb {
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--lsim-text);
        border: 2px solid var(--lsim-surface-1);
      }
      :host([variant='cct']) input::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--lsim-text);
        border: 2px solid var(--lsim-surface-1);
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
    'lsim-slider-field': LsimSliderField;
  }
}

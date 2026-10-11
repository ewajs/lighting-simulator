import { localized } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { fieldChangeEvent, newMergeKey } from './field-change';
import { fieldStyles } from './field-styles';
import { formatFixed } from './format';
import { parseNumberInput, stepValue } from './number-input';

/**
 * A labelled number input with a unit. Accepts "," or "." as decimal
 * separator; ↑/↓ step (×10 with Shift); Enter commits, Esc reverts. Invalid
 * text reverts to the current value and out-of-range values are clamped.
 *
 * @fires lxs-change - `detail: FieldChange`. One focus session shares a merge key.
 */
@customElement('lxs-number-field')
@localized()
export class LxsNumberField extends LitElement {
  static override styles = [
    fieldStyles,
    css`
      .control {
        display: flex;
        align-items: center;
        height: var(--lxs-control-h);
        background: var(--lxs-surface-2);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-md);
      }
      .control:hover {
        border-color: var(--lxs-line-strong);
      }
      .control:focus-within {
        border-color: var(--lxs-accent);
      }
      input {
        flex: 1;
        width: 100%;
        min-width: 0;
        height: 100%;
        padding: 0 var(--lxs-sp-2);
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        font-variant-numeric: tabular-nums;
        outline: none;
      }
      .unit {
        padding: 0 var(--lxs-sp-2);
        color: var(--lxs-text-faint);
        font-size: var(--lxs-fs-xs);
      }
      :host([disabled]) .control {
        opacity: 0.4;
      }
    `,
  ];

  @property() label = '';
  @property({ type: Number }) value = 0;
  @property() unit = '';
  @property({ type: Number }) step = 0.1;
  @property({ type: Number }) min = Number.NEGATIVE_INFINITY;
  @property({ type: Number }) max = Number.POSITIVE_INFINITY;
  @property({ type: Number }) decimals = 2;
  @property({ type: Boolean, reflect: true }) disabled = false;

  @query('input') private input!: HTMLInputElement;
  #mergeKey: string | undefined;

  override render() {
    return html`<label>
      <span class="label">${this.label}</span>
      <span class="control">
        <input
          type="text"
          inputmode="decimal"
          spellcheck="false"
          .value=${formatFixed(this.value, this.decimals)}
          ?disabled=${this.disabled}
          @focus=${this.#onFocus}
          @blur=${() => (this.#mergeKey = undefined)}
          @keydown=${this.#onKeyDown}
          @change=${this.#onChange}
        />
        ${this.unit ? html`<span class="unit">${this.unit}</span>` : ''}
      </span>
    </label>`;
  }

  #onFocus = (): void => {
    this.#mergeKey = newMergeKey();
    this.input.select();
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const direction = event.key === 'ArrowUp' ? 1 : -1;
      const { step, min, max, decimals } = this;
      this.#commit(
        stepValue(this.value, direction, { step, min, max, decimals, large: event.shiftKey }),
      );
    } else if (event.key === 'Enter') {
      this.input.blur();
    } else if (event.key === 'Escape') {
      this.#revert();
      this.input.blur();
    }
  };

  #onChange = (): void => {
    const parsed = parseNumberInput(this.input.value);
    if (Number.isNaN(parsed)) this.#revert();
    else this.#commit(Math.min(this.max, Math.max(this.min, parsed)));
  };

  #commit(value: number): void {
    this.dispatchEvent(fieldChangeEvent({ value, mergeKey: this.#mergeKey ?? newMergeKey() }));
    // Show the clamped/rounded value even if the host's value doesn't change.
    this.input.value = formatFixed(value, this.decimals);
  }

  #revert(): void {
    this.input.value = formatFixed(this.value, this.decimals);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-number-field': LxsNumberField;
  }
}

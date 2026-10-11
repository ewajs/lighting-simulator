import { css } from 'lit';

/** Label-above-control layout shared by the form field elements. */
export const fieldStyles = css`
  :host {
    display: grid;
    gap: 6px;
    min-width: 0;
    font: var(--lsim-fs-md) / 1.45 var(--lsim-font-ui);
    color: var(--lsim-text);
  }
  .label {
    display: flex;
    justify-content: space-between;
    color: var(--lsim-text-muted);
    font-size: var(--lsim-fs-xs);
  }
  .readout {
    color: var(--lsim-text);
    font-family: var(--lsim-font-mono);
  }
`;

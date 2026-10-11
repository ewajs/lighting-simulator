import { css } from 'lit';

/** Label-above-control layout shared by the form field elements. */
export const fieldStyles = css`
  :host {
    display: grid;
    gap: 6px;
    min-width: 0;
    font: var(--lxs-fs-md) / 1.45 var(--lxs-font-ui);
    color: var(--lxs-text);
  }
  .label {
    display: flex;
    justify-content: space-between;
    color: var(--lxs-text-muted);
    font-size: var(--lxs-fs-xs);
  }
  .readout {
    color: var(--lxs-text);
    font-family: var(--lxs-font-mono);
  }
`;

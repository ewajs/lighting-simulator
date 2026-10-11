import { css } from 'lit';

/**
 * Styles shared by the ui elements (each has its own shadow DOM). Only uses
 * --lsim-* tokens from theme.css.
 */
export const sharedStyles = css`
  :host {
    font: var(--lsim-fs-md) / 1.45 var(--lsim-font-ui);
    color: var(--lsim-text);
  }
  button,
  input {
    font: inherit;
    color: inherit;
  }
  :focus-visible {
    outline: 2px solid var(--lsim-accent);
    outline-offset: 2px;
    border-radius: var(--lsim-r-sm);
  }
  .icon {
    width: 16px;
    height: 16px;
    flex: none;
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--lsim-sp-2);
    height: 44px;
    padding: 0 var(--lsim-sp-4);
    border-bottom: 1px solid var(--lsim-line);
  }
  .panel-header h2 {
    margin: 0;
    font-size: var(--lsim-fs-md);
    font-weight: 600;
  }
  .meta {
    color: var(--lsim-text-faint);
    font-size: var(--lsim-fs-xs);
  }
  .group-label {
    padding: var(--lsim-sp-3) var(--lsim-sp-2) var(--lsim-sp-1);
    color: var(--lsim-text-faint);
    font-size: var(--lsim-fs-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--lsim-sp-2);
    height: var(--lsim-control-h);
    padding: 0 var(--lsim-sp-3);
    border: 1px solid var(--lsim-line-strong);
    border-radius: var(--lsim-r-md);
    background: transparent;
    cursor: pointer;
  }
  .btn:hover {
    background: var(--lsim-surface-3);
  }
  .icon-btn {
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: var(--lsim-r-md);
    background: transparent;
    color: var(--lsim-text-muted);
    cursor: pointer;
  }
  .icon-btn .icon {
    width: 18px;
    height: 18px;
  }
  .icon-btn:hover {
    background: var(--lsim-surface-3);
    color: var(--lsim-text);
  }
  .icon-btn[aria-selected='true'] {
    background: var(--lsim-accent-soft);
    color: var(--lsim-accent);
  }
  .empty {
    display: grid;
    justify-items: center;
    gap: var(--lsim-sp-3);
    padding: var(--lsim-sp-8) var(--lsim-sp-6);
    text-align: center;
    color: var(--lsim-text-muted);
    font-size: var(--lsim-fs-sm);
  }
`;

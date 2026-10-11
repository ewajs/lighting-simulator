import { css } from 'lit';

/**
 * Styles shared by the ui elements (each has its own shadow DOM). Only uses
 * --lxs-* tokens from theme.css.
 */
export const sharedStyles = css`
  :host {
    font: var(--lxs-fs-md) / 1.45 var(--lxs-font-ui);
    color: var(--lxs-text);
  }
  button,
  input {
    font: inherit;
    color: inherit;
  }
  :focus-visible {
    outline: 2px solid var(--lxs-accent);
    outline-offset: 2px;
    border-radius: var(--lxs-r-sm);
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
    gap: var(--lxs-sp-2);
    height: 44px;
    padding: 0 var(--lxs-sp-4);
    border-bottom: 1px solid var(--lxs-line);
  }
  .panel-header h2 {
    margin: 0;
    font-size: var(--lxs-fs-md);
    font-weight: 600;
  }
  .meta {
    color: var(--lxs-text-faint);
    font-size: var(--lxs-fs-xs);
  }
  .group-label {
    padding: var(--lxs-sp-3) var(--lxs-sp-2) var(--lxs-sp-1);
    color: var(--lxs-text-faint);
    font-size: var(--lxs-fs-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--lxs-sp-2);
    height: var(--lxs-control-h);
    padding: 0 var(--lxs-sp-3);
    border: 1px solid var(--lxs-line-strong);
    border-radius: var(--lxs-r-md);
    background: transparent;
    cursor: pointer;
  }
  .btn:hover {
    background: var(--lxs-surface-3);
  }
  .icon-btn {
    display: inline-grid;
    place-items: center;
    width: var(--lxs-icon-btn);
    height: var(--lxs-icon-btn);
    border: 0;
    border-radius: var(--lxs-r-md);
    background: transparent;
    color: var(--lxs-text-muted);
    cursor: pointer;
  }
  .icon-btn .icon {
    width: 18px;
    height: 18px;
  }
  .icon-btn:hover {
    background: var(--lxs-surface-3);
    color: var(--lxs-text);
  }
  .icon-btn[aria-selected='true'] {
    background: var(--lxs-accent-soft);
    color: var(--lxs-accent);
  }
  .empty {
    display: grid;
    justify-items: center;
    gap: var(--lxs-sp-3);
    padding: var(--lxs-sp-8) var(--lxs-sp-6);
    text-align: center;
    color: var(--lxs-text-muted);
    font-size: var(--lxs-fs-sm);
  }
`;

/** Sections, grids, chips and the entity header used by the inspector views. */
export const inspectorStyles = css`
  :host {
    display: block;
  }
  .entity {
    display: flex;
    gap: var(--lxs-sp-3);
    padding: var(--lxs-sp-4);
    border-bottom: 1px solid var(--lxs-line);
  }
  .thumb {
    display: grid;
    place-items: center;
    flex: none;
    width: 48px;
    height: 48px;
    border: 1px solid var(--lxs-line);
    border-radius: var(--lxs-r-md);
    background: var(--lxs-surface-2);
    color: var(--lxs-text-faint);
  }
  .thumb .icon {
    width: 22px;
    height: 22px;
  }
  .title {
    font-size: var(--lxs-fs-lg);
    font-weight: 600;
  }
  .sub {
    color: var(--lxs-text-muted);
    font-size: var(--lxs-fs-sm);
  }
  .actions {
    display: flex;
    gap: var(--lxs-sp-1);
    padding: var(--lxs-sp-2) var(--lxs-sp-3);
    border-bottom: 1px solid var(--lxs-line);
  }
  .actions .spacer {
    flex: 1;
  }
  .icon-btn[aria-pressed='true'] {
    background: var(--lxs-accent-soft);
    color: var(--lxs-accent);
  }
  .icon-btn.danger:hover {
    color: var(--lxs-danger);
  }
  section {
    display: grid;
    gap: var(--lxs-sp-3);
    padding: var(--lxs-sp-3) var(--lxs-sp-4) var(--lxs-sp-4);
    border-bottom: 1px solid var(--lxs-line);
  }
  h3 {
    margin: 0;
    color: var(--lxs-text-faint);
    font-size: var(--lxs-fs-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .grid-2,
  .grid-3 {
    display: grid;
    gap: var(--lxs-sp-2);
  }
  .grid-2 {
    grid-template-columns: 1fr 1fr;
  }
  .grid-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  .spec {
    display: flex;
    justify-content: space-between;
    font-size: var(--lxs-fs-sm);
    color: var(--lxs-text-muted);
  }
  .spec span:last-child {
    color: var(--lxs-text);
    font-family: var(--lxs-font-mono);
  }
  .warn {
    color: var(--lxs-warn) !important;
  }
  .hint {
    padding: var(--lxs-sp-4);
    color: var(--lxs-text-muted);
    font-size: var(--lxs-fs-sm);
  }
`;

/** Segmented control (mutually exclusive options), used by the top bar and viewport controls. */
export const segmentedStyles = css`
  .segmented {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--lxs-line);
    border-radius: var(--lxs-r-md);
    background: var(--lxs-surface-2);
  }
  .segmented button {
    height: var(--lxs-segment-h);
    padding: 0 var(--lxs-sp-3);
    border: 0;
    border-radius: var(--lxs-r-sm);
    background: transparent;
    color: var(--lxs-text-muted);
    font-size: var(--lxs-fs-sm);
    font-weight: 500;
    cursor: pointer;
  }
  .segmented button:hover {
    color: var(--lxs-text);
  }
  .segmented button[aria-checked='true'] {
    background: var(--lxs-surface-3);
    color: var(--lxs-text);
  }
  .segmented button:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

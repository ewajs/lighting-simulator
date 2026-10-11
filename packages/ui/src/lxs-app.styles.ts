import { css } from 'lit';

/** Layout of `<lxs-app>`: desktop grid, tablet sheet, phone tab bar (ADR 0030, 0031). */
export const appStyles = css`
  :host {
    --lxs-left-w: var(--lxs-panel-w);
    --lxs-right-w: var(--lxs-inspector-w);
    display: grid;
    height: 100%;
    grid-template-columns: var(--lxs-left-w) minmax(0, 1fr) var(--lxs-right-w);
    grid-template-rows: var(--lxs-topbar-h) minmax(0, 1fr) var(--lxs-statusbar-h);
    grid-template-areas:
      'top top top'
      'left viewport right'
      'status status status';
    background: var(--lxs-bg);
    color: var(--lxs-text);
    font: var(--lxs-fs-md) / 1.45 var(--lxs-font-ui);
    -webkit-font-smoothing: antialiased;
  }
  :host([library-collapsed]) {
    --lxs-left-w: 48px;
  }
  :host([inspector-collapsed]) {
    --lxs-right-w: 0px;
  }
  :host([inspector-collapsed]) .inspector {
    display: none;
  }
  lxs-top-bar {
    grid-area: top;
  }
  lxs-library {
    grid-area: left;
    border-right: 1px solid var(--lxs-line);
  }
  .inspector {
    grid-area: right;
    border-left: 1px solid var(--lxs-line);
  }
  .stage {
    grid-area: viewport;
    position: relative;
    min-width: 0;
    min-height: 0;
  }
  lxs-viewport {
    position: absolute;
    inset: 0;
  }
  footer {
    grid-area: status;
    display: flex;
    align-items: center;
    gap: var(--lxs-sp-4);
    padding: 0 var(--lxs-sp-4);
    background: var(--lxs-surface-1);
    border-top: 1px solid var(--lxs-line);
    color: var(--lxs-text-muted);
    font-size: var(--lxs-fs-xs);
  }
  /* Tablet: the inspector floats over the bottom of the viewport. */
  @media (max-width: 900px) {
    :host {
      grid-template-columns: var(--lxs-left-w) minmax(0, 1fr);
      grid-template-areas:
        'top top'
        'left viewport'
        'status status';
    }
    .stage {
      /* Keeps floating controls above the collapsed sheet: header + margins. */
      --lxs-stage-inset-bottom: calc(44px + 2 * var(--lxs-sp-2));
    }
    .inspector {
      grid-area: viewport;
      z-index: 1;
      align-self: end;
      max-height: 45%;
      margin: var(--lxs-sp-2);
      border: 1px solid var(--lxs-line);
      border-radius: var(--lxs-r-lg);
      box-shadow: var(--lxs-shadow);
    }
  }
  /* Phone: full-screen viewport, sheets over it, tab bar at the bottom. */
  :host([phone]) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: var(--lxs-topbar-h) minmax(0, 1fr) auto;
    grid-template-areas: 'top' 'viewport' 'tabs';
  }
  lxs-tab-bar {
    grid-area: tabs;
  }
  .phone-sheet {
    grid-area: viewport;
    z-index: 1;
    align-self: end;
    height: 55%;
  }
  .phone-sheet[expanded] {
    height: 100%;
  }
  /* The sheet has its own title bar; hide the panels' duplicate headers. */
  .phone-sheet > *::part(header) {
    display: none;
  }
`;

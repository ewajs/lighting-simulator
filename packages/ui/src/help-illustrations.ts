// Small looping illustrations for the help carousel (ADR 0046): schematic,
// language-neutral and drawn with the theme's tokens. Each fills a
// 240 × 150 viewBox; the motion lives in lxs-help's styles, keyed by class.
// With reduced motion, every illustration stands still in a meaningful pose.

import { svg, type SVGTemplateResult } from 'lit';

/** The illustrations, one per help step. */
export type IllustrationName =
  'welcome' | 'add' | 'move' | 'aim' | 'light' | 'view' | 'precision' | 'ies';

/** A room seen from the front: back wall, floor and the ceiling's edge. */
const room = svg`
  <rect class="wall" x="40" y="14" width="160" height="88" rx="2" />
  <polygon class="floor" points="40,102 200,102 236,142 4,142" />
  <line class="edge" x1="4" y1="14" x2="236" y2="14" />
`;

/** A recessed fixture at `x` on the ceiling, its light cone and pool. */
const fixture = (x: number, beamClass = 'beam') => svg`
  <polygon class=${beamClass} points="${x - 5},16 ${x + 5},16 ${x + 30},102 ${x - 30},102" />
  <ellipse class="pool" cx=${x} cy="110" rx="34" ry="7" />
  <rect class="body" x=${x - 7} y="12" width="14" height="5" rx="1.5" />
`;

/** A mouse pointer whose tip is at the origin. */
const pointer = svg`<path class="pointer" d="M0,0 L0,15 L4,11 L7,18 L10,17 L7,10 L12,10 Z" />`;

const illustrations: Record<IllustrationName, SVGTemplateResult> = {
  welcome: svg`${room}<g class="glow">${fixture(120)}</g>`,

  add: svg`
    ${room}
    <g class="catalog">
      <rect class="panel" x="8" y="26" width="52" height="64" rx="4" />
      <rect class="card" x="14" y="34" width="40" height="14" rx="2" />
      <rect class="card" x="14" y="54" width="40" height="14" rx="2" />
    </g>
    <g class="appear">${fixture(140)}</g>
    <g class="fly"><rect class="card selected" x="14" y="34" width="40" height="14" rx="2" />
      <g transform="translate(40,44)">${pointer}</g></g>
  `,

  move: svg`
    ${room}
    <g class="slide">
      ${fixture(90)}
      <rect class="outline" x="78" y="8" width="24" height="13" rx="2" />
      <g transform="translate(94,18)">${pointer}</g>
    </g>
  `,

  aim: svg`
    ${room}
    <g class="swing">
      <polygon class="beam" points="122,18 128,18 146,104 104,104" />
      <ellipse class="pool" cx="125" cy="108" rx="22" ry="5" />
      <circle class="dot" cx="125" cy="108" r="5" />
    </g>
    <ellipse class="ring" cx="125" cy="15" rx="20" ry="6" />
    <rect class="body" x="118" y="11" width="14" height="7" rx="2" />
  `,

  light: svg`
    ${room}
    <g class="dim">${fixture(120, 'beam tint')}</g>
    <line class="track" x1="60" y1="132" x2="180" y2="132" />
    <circle class="knob" cx="80" cy="132" r="6" />
  `,

  view: svg`
    <g class="orbit">${room}${fixture(120)}</g>
    <path class="arc" d="M60,146 Q120,128 180,146" />
    <circle class="mover" cx="60" cy="146" r="4" />
  `,

  precision: svg`
    ${room}
    <g class="grid">
      ${[70, 90, 110, 130, 150, 170].map((x) => svg`<circle class="tick" cx=${x} cy="8" r="1.4" />`)}
    </g>
    <line class="guide" x1="150" y1="10" x2="150" y2="142" />
    <g class="step">${fixture(70)}</g>
    <rect class="body other" x="143" y="12" width="14" height="5" rx="1.5" />
    <path class="undo" d="M206,38 a12,12 0 1 1 -4,18 M206,30 l0,10 l10,0" />
  `,

  ies: svg`
    ${room}
    <g class="drop">
      <path class="file" d="M98,22 h30 l10,10 v40 h-40 z" />
      <path class="fold" d="M128,22 v10 h10" />
      <text class="label" x="118" y="58" text-anchor="middle">IES</text>
    </g>
    <path class="lobe" d="M120,104 C 70,104 60,128 120,140 C 180,128 170,104 120,104 z" />
  `,
};

/** The illustration for a help step. */
export function illustration(name: IllustrationName): SVGTemplateResult {
  return illustrations[name];
}

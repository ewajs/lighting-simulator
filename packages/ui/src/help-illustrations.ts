// Small looping illustrations for the help carousel (ADRs 0046, 0055):
// schematic, language-neutral and drawn with the theme's tokens. Each fills a
// 240 × 150 viewBox; the motion lives in help-styles.ts, keyed by class. With
// reduced motion, every illustration stands still in a meaningful pose.
//
// One room for all of them: a back wall, the floor in perspective and the
// ceiling's edge. A light's beam ends exactly where its pool lies on the
// floor, so the light visibly lands. Interface parts use real Lucide icons.

import { svg, type SVGTemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import {
  FilePlus,
  FolderOpen,
  Lightbulb,
  Link,
  Rotate3d,
  Save,
  Share2,
  Sofa,
  SunDim,
  Thermometer,
  Undo2,
  type IconNode,
} from 'lucide';
import { iconMarkup } from './icons';

/** The illustrations, one per help step. */
export type IllustrationName =
  'welcome' | 'add' | 'move' | 'aim' | 'light' | 'room' | 'view' | 'precision' | 'files' | 'ies';

/** Where the floor's middle is: pools of light lie on it. */
const FLOOR_Y = 118;
/** The ceiling's edge: fixtures hang from it. */
const CEILING_Y = 14;

/** Gradients shared by the drawings: a beam fading downwards, a soft pool. */
const defs = svg`
  <defs>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="beam-top" />
      <stop offset="1" class="beam-bottom" />
    </linearGradient>
    <radialGradient id="pool">
      <stop offset="0" class="pool-centre" />
      <stop offset="1" class="pool-edge" />
    </radialGradient>
  </defs>
`;

/** A room seen from the front: back wall, floor and the ceiling's edge. */
const room = svg`
  <rect class="wall" x="40" y=${CEILING_Y} width="160" height="82" />
  <polygon class="floor" points="40,96 200,96 236,140 4,140" />
  <line class="edge" x1="4" y1=${CEILING_Y} x2="236" y2=${CEILING_Y} />
`;

/** A recessed fixture at `x`: its body on the ceiling, a beam, and the pool where it lands. */
function fixture(x: number, spread = 30) {
  return svg`
    <polygon class="beam" points="${x - 4},${CEILING_Y + 2} ${x + 4},${CEILING_Y + 2} ${x + spread},${FLOOR_Y} ${x - spread},${FLOOR_Y}" />
    <ellipse class="pool" cx=${x} cy=${FLOOR_Y} rx=${spread} ry="7" />
    <rect class="body" x=${x - 7} y=${CEILING_Y - 3} width="14" height="5" rx="1.5" />
  `;
}

/** A sofa standing on the floor, centred at `x`, `width` wide. */
function sofa(x: number, width = 56) {
  const left = x - width / 2;
  return svg`
    <rect class="piece" x=${left} y="104" width=${width} height="12" rx="3" />
    <rect class="piece light" x=${left + 4} y="112" width=${width - 8} height="9" rx="2" />
    <rect class="piece" x=${left - 3} y="108" width="7" height="15" rx="2.5" />
    <rect class="piece" x=${left + width - 4} y="108" width="7" height="15" rx="2.5" />
  `;
}

/** A table standing on the floor, centred at `x`. */
function table(x: number) {
  return svg`
    <rect class="piece light" x=${x - 26} y="108" width="52" height="4" rx="1.5" />
    <rect class="piece" x=${x - 22} y="112" width="3" height="16" />
    <rect class="piece" x=${x + 19} y="112" width="3" height="16" />
  `;
}

/** A Lucide icon at (`x`, `y`), `size` wide, coloured by the class. */
function glyph(node: IconNode, x: number, y: number, size: number, className = 'glyph') {
  return svg`<svg class=${className} x=${x} y=${y} width=${size} height=${size} viewBox="0 0 24 24">${unsafeSVG(iconMarkup(node))}</svg>`;
}

/** A mouse pointer whose tip is at the origin. */
const pointer = svg`<path class="pointer" d="M0,0 L0,15 L4,11 L7,18 L10,17 L7,10 L12,10 Z" />`;

/** The catalog panel at the left, with the luminaires / furniture switch at its top. */
const catalog = svg`
  <rect class="panel" x="6" y="22" width="56" height="100" rx="5" />
  <rect class="switch" x="11" y="28" width="46" height="14" rx="4" />
  <rect class="switch-thumb" x="12" y="29" width="22" height="12" rx="3" />
  ${glyph(Lightbulb, 18, 30, 10)}
  ${glyph(Sofa, 40, 30, 10)}
  <rect class="card" x="11" y="50" width="46" height="14" rx="3" />
  <rect class="card" x="11" y="70" width="46" height="14" rx="3" />
  <rect class="card" x="11" y="90" width="46" height="14" rx="3" />
`;

const illustrations: Record<IllustrationName, SVGTemplateResult> = {
  welcome: svg`
    ${room}
    <g class="glow a">${fixture(88, 28)}</g>
    <g class="glow b">${fixture(152, 28)}</g>
    ${table(120)}
  `,

  // A luminaire comes from the catalog, then the switch turns to furniture and a sofa does.
  add: svg`
    ${room}
    ${catalog}
    <g class="appear-light">${fixture(150, 26)}</g>
    <g class="appear-piece">${sofa(150)}</g>
    <g class="fly-card"><rect class="card selected" x="11" y="50" width="46" height="14" rx="3" /></g>
    <g class="pointer-path"><g transform="translate(44,58)">${pointer}</g></g>
  `,

  // The arrows slide a luminaire; the ring on the floor turns a piece.
  move: svg`
    ${room}
    <g class="slide">
      ${fixture(84, 24)}
      <line class="arrow-x" x1="66" y1="30" x2="102" y2="30" />
      <path class="arrow-x-head" d="M62,30 l7,-4 v8 z M106,30 l-7,-4 v8 z" />
    </g>
    <ellipse class="ring" cx="168" cy="122" rx="40" ry="10" />
    <ellipse class="ring-arc" cx="168" cy="122" rx="40" ry="10" pathLength="100" />
    <g class="turn">${sofa(168, 50)}</g>
  `,

  // A track spot on the picture: the beam ends on the dot, which drags it.
  aim: svg`
    ${room}
    <line class="rail" x1="40" y1=${CEILING_Y + 2} x2="120" y2=${CEILING_Y + 2} />
    <rect class="frame" x="128" y="40" width="48" height="32" rx="1.5" />
    <g class="swing">
      <!-- From the head to the spot's tangent points, so the beam meets it exactly. -->
      <polygon class="beam" points="80,22 157.8,40.7 152,56 138,67.4" />
      <ellipse class="spot" cx="152" cy="56" rx="20" ry="16" />
      <circle class="dot" cx="152" cy="56" r="4.5" />
    </g>
    <ellipse class="ring" cx="80" cy="22" rx="16" ry="5" />
    <rect class="body" x="74" y=${CEILING_Y + 1} width="12" height="9" rx="2" />
  `,

  // Properties' sliders: dimming, then colour temperature.
  light: svg`
    ${room}
    <g class="dim">${fixture(78, 30)}</g>
    <rect class="panel" x="138" y="36" width="94" height="62" rx="5" />
    ${glyph(SunDim, 146, 46, 12)}
    <line class="track" x1="164" y1="52" x2="222" y2="52" />
    <circle class="knob knob-dim" cx="200" cy="52" r="5" />
    ${glyph(Thermometer, 146, 74, 12)}
    <line class="track cct" x1="164" y1="80" x2="222" y2="80" />
    <circle class="knob knob-cct" cx="176" cy="80" r="5" />
  `,

  // Swatches change the floor: planks, tiles, concrete.
  room: svg`
    <defs>
      <pattern id="planks" width="40" height="8" patternUnits="userSpaceOnUse">
        <path class="seam" d="M0,8 H40 M12,0 V8 M32,4 V8" />
      </pattern>
      <pattern id="tiles" width="16" height="10" patternUnits="userSpaceOnUse">
        <path class="seam" d="M0,10 H16 M16,0 V10" />
      </pattern>
      <pattern id="speckle" width="12" height="9" patternUnits="userSpaceOnUse">
        <circle class="speck" cx="3" cy="2" r="0.8" />
        <circle class="speck" cx="9" cy="6" r="0.6" />
      </pattern>
    </defs>
    ${room}
    <polygon class="finish planks" points="40,96 200,96 236,140 4,140" />
    <polygon class="finish tiles" points="40,96 200,96 236,140 4,140" />
    <polygon class="finish speckle" points="40,96 200,96 236,140 4,140" />
    ${fixture(120, 30)}
    <rect class="panel" x="182" y="24" width="40" height="66" rx="5" />
    <circle class="swatch planks" cx="202" cy="38" r="8" />
    <circle class="swatch tiles" cx="202" cy="57" r="8" />
    <circle class="swatch speckle" cx="202" cy="76" r="8" />
    <circle class="pick" cx="202" cy="38" r="11" />
  `,

  // Dragging orbits the room.
  view: svg`
    <g class="orbit">${room}${fixture(120, 30)}</g>
    <g class="drag"><g transform="translate(70,58)">${pointer}</g></g>
    ${glyph(Rotate3d, 206, 22, 18, 'glyph muted')}
  `,

  // Steps on the 10 cm grid, a guide when lined up, then Undo puts it back.
  precision: svg`
    ${room}
    ${[70, 90, 110, 130, 150].map((x) => svg`<circle class="tick" cx=${x} cy="7" r="1.4" />`)}
    <line class="guide" x1="150" y1=${CEILING_Y} x2="150" y2="140" />
    <rect class="body other" x="143" y=${CEILING_Y - 3} width="14" height="5" rx="1.5" />
    <g class="step">${fixture(70, 24)}</g>
    <circle class="button" cx="210" cy="40" r="14" />
    ${glyph(Undo2, 201, 31, 18, 'glyph undo')}
  `,

  // The top bar's New, Open, Save and Share, one after another.
  files: svg`
    <rect class="panel" x="24" y="18" width="192" height="30" rx="6" />
    <rect class="highlight" x="38" y="22" width="30" height="22" rx="4" />
    ${glyph(FilePlus, 44, 24, 18)}
    ${glyph(FolderOpen, 88, 24, 18)}
    ${glyph(Save, 132, 24, 18)}
    ${glyph(Share2, 176, 24, 18)}
    <g class="shows new">${glyph(FilePlus, 100, 66, 40, 'glyph big')}</g>
    <g class="shows open">${glyph(FolderOpen, 100, 66, 40, 'glyph big')}</g>
    <g class="shows save">${glyph(Save, 100, 66, 40, 'glyph big')}</g>
    <g class="shows share">${glyph(Link, 100, 66, 40, 'glyph big')}</g>
  `,

  // An IES file drops into the catalog, and the luminaire's real distribution shows,
  // as the polar chart lighting people know from photometric reports.
  ies: svg`
    ${room}
    <rect class="panel" x="6" y="22" width="56" height="100" rx="5" />
    <rect class="dropzone" x="11" y="78" width="46" height="38" rx="4" />
    <g class="drop">
      <path class="file" d="M22,40 h18 l7,7 v26 h-25 z" />
      <path class="fold" d="M40,40 v7 h7" />
      <text class="label" x="34" y="65" text-anchor="middle">IES</text>
    </g>
    <g class="chart">
      ${[36, 72, 104].map(
        (r) => svg`<path class="polar" d="M${150 - r},16 A${r},${r} 0 0 0 ${150 + r},16" />`,
      )}
      <line class="polar" x1="150" y1="16" x2="150" y2="122" />
      <path
        class="lobe"
        d="M150,16 C 126,26 108,70 120,92 C 129,106 143,92 150,62 C 157,92 171,106 180,92 C 192,70 174,26 150,16 Z"
      />
    </g>
    <rect class="body" x="143" y=${CEILING_Y - 3} width="14" height="5" rx="1.5" />
  `,
};

/** The illustration for a help step. */
export function illustration(name: IllustrationName): SVGTemplateResult {
  return svg`${defs}${illustrations[name]}`;
}

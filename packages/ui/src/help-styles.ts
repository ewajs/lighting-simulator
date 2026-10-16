// Colours and motion for the help illustrations (help-illustrations.ts). Only
// theme tokens, so they follow the light and dark themes. Each loop lasts a
// few seconds; with reduced motion they stand still, and every element's
// resting style below is that still pose.

import { css } from 'lit';

/** Styles for `<svg class="art …">` illustrations. */
export const illustrationStyles = css`
  /* The room and its light. */
  .art .wall {
    fill: var(--lxs-surface-3);
  }
  .art .floor {
    fill: var(--lxs-surface-2);
  }
  .art .edge,
  .art .rail,
  .art .track {
    stroke: var(--lxs-line-strong);
    stroke-width: 2;
    stroke-linecap: round;
  }
  .art .body {
    fill: var(--lxs-text);
  }
  .art .body.other {
    fill: var(--lxs-text-muted);
  }
  .art .beam {
    fill: url(#beam);
  }
  .art .beam-top {
    stop-color: var(--lxs-accent);
    stop-opacity: 0.45;
  }
  .art .beam-bottom {
    stop-color: var(--lxs-accent);
    stop-opacity: 0.12;
  }
  .art .pool {
    fill: url(#pool);
  }
  .art .pool-centre {
    stop-color: var(--lxs-accent);
    stop-opacity: 0.6;
  }
  .art .pool-edge {
    stop-color: var(--lxs-accent);
    stop-opacity: 0;
  }
  .art .piece {
    fill: var(--lxs-line-strong);
  }
  .art .piece.light {
    fill: var(--lxs-text-faint);
  }

  /* Interface parts. */
  .art .panel,
  .art .button {
    fill: var(--lxs-surface-1);
    stroke: var(--lxs-line);
  }
  .art .switch {
    fill: var(--lxs-surface-2);
  }
  .art .switch-thumb,
  .art .card {
    fill: var(--lxs-surface-3);
  }
  .art .card.selected,
  .art .knob,
  .art .dot {
    fill: var(--lxs-accent);
  }
  .art .highlight {
    fill: var(--lxs-accent-soft);
  }
  .art .glyph {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    color: var(--lxs-text-muted);
  }
  .art .glyph.big {
    color: var(--lxs-text);
    stroke-width: 1.5;
  }
  .art .glyph.undo {
    color: var(--lxs-accent);
  }
  .art .pointer {
    fill: var(--lxs-text);
    stroke: var(--lxs-bg);
    stroke-width: 1;
  }

  /* Handles: the move arrow in the x axis's red, the floor ring, the aim. */
  .art .arrow-x {
    stroke: var(--lxs-danger);
    stroke-width: 2.5;
  }
  .art .arrow-x-head {
    fill: var(--lxs-danger);
  }
  .art .ring {
    fill: none;
    stroke: var(--lxs-accent);
    stroke-width: 1.5;
    opacity: 0.55;
  }
  .art .ring-arc {
    fill: none;
    stroke: var(--lxs-accent);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 14 86;
  }
  .art .frame {
    fill: var(--lxs-surface-2);
    stroke: var(--lxs-text-faint);
    stroke-width: 1.5;
  }
  .art .spot {
    fill: var(--lxs-accent);
    opacity: 0.35;
  }

  /* The room's materials and their swatches. */
  .art .seam {
    fill: none;
    stroke: var(--lxs-line-strong);
    stroke-width: 1;
  }
  .art .speck {
    fill: var(--lxs-text-faint);
  }
  .art .finish.planks,
  .art .swatch.planks {
    fill: url(#planks);
  }
  .art .finish.tiles,
  .art .swatch.tiles {
    fill: url(#tiles);
  }
  .art .finish.speckle,
  .art .swatch.speckle {
    fill: url(#speckle);
  }
  .art .finish.tiles,
  .art .finish.speckle {
    opacity: 0;
  }
  .art .swatch {
    stroke: var(--lxs-line-strong);
  }
  .art .pick {
    fill: none;
    stroke: var(--lxs-accent);
    stroke-width: 2;
  }

  /* Precision. */
  .art .tick {
    fill: var(--lxs-text-faint);
  }
  .art .guide {
    stroke: var(--lxs-guide);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
    opacity: 0;
  }

  /* Files: one big icon at a time. */
  .art .shows {
    opacity: 0;
  }
  .art .shows.new {
    opacity: 1;
  }

  /* IES. */
  .art .dropzone {
    fill: none;
    stroke: var(--lxs-text-faint);
    stroke-dasharray: 3 3;
  }
  .art .file {
    fill: var(--lxs-surface-1);
    stroke: var(--lxs-text-muted);
    stroke-width: 1.5;
  }
  .art .fold {
    fill: none;
    stroke: var(--lxs-text-muted);
    stroke-width: 1.5;
  }
  .art .label {
    fill: var(--lxs-accent);
    font: 700 9px var(--lxs-font-ui);
  }
  .art .polar {
    fill: none;
    stroke: var(--lxs-line-strong);
    stroke-dasharray: 2 3;
  }
  .art .lobe {
    fill: var(--lxs-accent);
    fill-opacity: 0.18;
    stroke: var(--lxs-accent);
    stroke-width: 1.5;
  }

  /* Motion. transform-box keeps transform-origin relative to each shape. */
  .art * {
    transform-box: fill-box;
  }
  .welcome .glow {
    animation: breathe 3s ease-in-out infinite alternate;
  }
  .welcome .glow.b {
    animation-delay: -1.5s;
  }
  .add .fly-card,
  .add .pointer-path {
    animation: add-fly 6s ease-in-out infinite;
  }
  .add .appear-light {
    animation: add-light 6s ease-in-out infinite;
  }
  .add .appear-piece {
    animation: add-piece 6s ease-in-out infinite;
  }
  .add .switch-thumb {
    animation: add-switch 6s ease-in-out infinite;
  }
  .move .slide {
    animation: slide 4s ease-in-out infinite;
  }
  .move .turn {
    transform-origin: 50% 100%;
    animation: turn 4s ease-in-out infinite;
  }
  .move .ring-arc {
    animation: around 4s ease-in-out infinite;
  }
  .aim .swing {
    /* Around the spot's head, in the drawing's own coordinates. */
    transform-box: view-box;
    transform-origin: 80px 22px;
    animation: swing 4s ease-in-out infinite;
  }
  .light .dim {
    animation: dim 6s ease-in-out infinite;
  }
  .light .knob-dim {
    animation: knob-dim 6s ease-in-out infinite;
  }
  .light .knob-cct {
    animation: knob-cct 6s ease-in-out infinite;
  }
  .light .beam-top,
  .light .pool-centre {
    animation: cct 6s ease-in-out infinite;
  }
  .room .finish.planks {
    animation: first-third 6s infinite;
  }
  .room .finish.tiles {
    animation: second-third 6s infinite;
  }
  .room .finish.speckle {
    animation: last-third 6s infinite;
  }
  .room .pick {
    animation: pick 6s ease-in-out infinite;
  }
  .view .orbit {
    transform-origin: 50% 50%;
    animation: orbit 5s ease-in-out infinite;
  }
  .view .drag {
    animation: drag 5s ease-in-out infinite;
  }
  .precision .step {
    animation: step 5s ease-in-out infinite;
  }
  .precision .guide {
    animation: guide 5s infinite;
  }
  .precision .glyph.undo,
  .precision .button {
    transform-origin: 50% 50%;
    animation: press 5s ease-in-out infinite;
  }
  .files .highlight {
    animation: highlight 8s infinite;
  }
  .files .shows.new {
    animation: first-quarter 8s infinite;
  }
  .files .shows.open {
    animation: second-quarter 8s infinite;
  }
  .files .shows.save {
    animation: third-quarter 8s infinite;
  }
  .files .shows.share {
    animation: last-quarter 8s infinite;
  }
  .ies .drop {
    animation: drop 5s ease-in-out infinite;
  }
  .ies .chart {
    transform-origin: 50% 0%;
    animation: lobe 5s ease-in-out infinite;
  }

  @keyframes breathe {
    from {
      opacity: 0.55;
    }
    to {
      opacity: 1;
    }
  }
  /* A card and the pointer fly to the room twice: a luminaire, then a sofa. */
  @keyframes add-fly {
    0%,
    10% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    28% {
      transform: translate(96px, -30px) scale(0.6);
      opacity: 1;
    }
    33%,
    50% {
      transform: translate(96px, -30px) scale(0.6);
      opacity: 0;
    }
    55%,
    62% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    78% {
      transform: translate(96px, 44px) scale(0.6);
      opacity: 1;
    }
    83%,
    100% {
      transform: translate(96px, 44px) scale(0.6);
      opacity: 0;
    }
  }
  @keyframes add-light {
    0%,
    28% {
      opacity: 0;
    }
    34%,
    92% {
      opacity: 1;
    }
    98%,
    100% {
      opacity: 0;
    }
  }
  @keyframes add-piece {
    0%,
    77% {
      opacity: 0;
    }
    83%,
    92% {
      opacity: 1;
    }
    98%,
    100% {
      opacity: 0;
    }
  }
  @keyframes add-switch {
    0%,
    44% {
      transform: translateX(0);
    }
    50%,
    92% {
      transform: translateX(22px);
    }
    98%,
    100% {
      transform: translateX(0);
    }
  }
  @keyframes slide {
    0%,
    10%,
    100% {
      transform: translateX(0);
    }
    45%,
    60% {
      transform: translateX(40px);
    }
  }
  @keyframes turn {
    0%,
    10%,
    100% {
      transform: scaleX(1);
    }
    45%,
    60% {
      transform: scaleX(0.45);
    }
  }
  @keyframes around {
    0%,
    10% {
      stroke-dashoffset: 0;
    }
    60%,
    100% {
      stroke-dashoffset: -50;
    }
  }
  @keyframes swing {
    0%,
    100% {
      transform: rotate(-7deg);
    }
    50% {
      transform: rotate(5deg);
    }
  }
  /* Dimming first, then colour temperature, warm to cool and back. */
  @keyframes dim {
    0%,
    100% {
      opacity: 1;
    }
    25% {
      opacity: 0.35;
    }
    50% {
      opacity: 1;
    }
  }
  @keyframes knob-dim {
    0%,
    50%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-30px);
    }
  }
  @keyframes knob-cct {
    0%,
    50%,
    100% {
      transform: translateX(0);
    }
    75% {
      transform: translateX(40px);
    }
  }
  @keyframes cct {
    0%,
    50%,
    100% {
      stop-color: var(--lxs-accent);
    }
    62% {
      stop-color: var(--lxs-cct-warm);
    }
    80% {
      stop-color: var(--lxs-cct-cool);
    }
  }
  @keyframes first-third {
    0%,
    30% {
      opacity: 1;
    }
    34%,
    96% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  @keyframes second-third {
    0%,
    30% {
      opacity: 0;
    }
    34%,
    63% {
      opacity: 1;
    }
    67%,
    100% {
      opacity: 0;
    }
  }
  @keyframes last-third {
    0%,
    63% {
      opacity: 0;
    }
    67%,
    96% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  @keyframes pick {
    0%,
    30%,
    98%,
    100% {
      transform: translateY(0);
    }
    34%,
    63% {
      transform: translateY(19px);
    }
    67%,
    94% {
      transform: translateY(38px);
    }
  }
  @keyframes orbit {
    0%,
    100% {
      transform: scaleX(1) skewY(0deg);
    }
    50% {
      transform: scaleX(0.82) skewY(-4deg);
    }
  }
  @keyframes drag {
    0%,
    100% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(90px);
    }
  }
  /* Steps along the 10 cm grid, lines up with the other light, then Undo takes it back. */
  @keyframes step {
    0%,
    12% {
      transform: translateX(0);
    }
    16%,
    28% {
      transform: translateX(20px);
    }
    32%,
    44% {
      transform: translateX(40px);
    }
    48%,
    60% {
      transform: translateX(60px);
    }
    64%,
    84% {
      transform: translateX(80px);
    }
    90%,
    100% {
      transform: translateX(0);
    }
  }
  @keyframes guide {
    0%,
    63% {
      opacity: 0;
    }
    64%,
    84% {
      opacity: 1;
    }
    85%,
    100% {
      opacity: 0;
    }
  }
  @keyframes press {
    0%,
    82%,
    94%,
    100% {
      transform: scale(1);
    }
    87% {
      transform: scale(0.88);
    }
  }
  @keyframes highlight {
    0%,
    24% {
      transform: translateX(0);
    }
    25%,
    49% {
      transform: translateX(44px);
    }
    50%,
    74% {
      transform: translateX(88px);
    }
    75%,
    100% {
      transform: translateX(132px);
    }
  }
  @keyframes first-quarter {
    0%,
    22% {
      opacity: 1;
    }
    25%,
    100% {
      opacity: 0;
    }
  }
  @keyframes second-quarter {
    0%,
    24% {
      opacity: 0;
    }
    27%,
    47% {
      opacity: 1;
    }
    50%,
    100% {
      opacity: 0;
    }
  }
  @keyframes third-quarter {
    0%,
    49% {
      opacity: 0;
    }
    52%,
    72% {
      opacity: 1;
    }
    75%,
    100% {
      opacity: 0;
    }
  }
  @keyframes last-quarter {
    0%,
    74% {
      opacity: 0;
    }
    77%,
    97% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  @keyframes drop {
    0% {
      transform: translateY(-24px);
      opacity: 0;
    }
    25%,
    35% {
      transform: translateY(0);
      opacity: 1;
    }
    50%,
    100% {
      transform: translateY(40px) scale(0.6);
      opacity: 0;
    }
  }
  @keyframes lobe {
    0%,
    45% {
      transform: scale(0.15);
      opacity: 0;
    }
    65%,
    92% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .art * {
      animation: none !important;
    }
  }
`;

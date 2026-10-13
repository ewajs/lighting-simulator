// Colours and motion for the help illustrations (help-illustrations.ts). Only
// theme tokens, so they follow the light and dark themes. Each loop is a few
// seconds long; with reduced motion they stand still.

import { css } from 'lit';

/** Styles for `<svg class="art …">` illustrations. */
export const illustrationStyles = css`
  .art .wall {
    fill: var(--lxs-surface-3);
  }
  .art .floor {
    fill: var(--lxs-surface-2);
  }
  .art .edge,
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
    fill: var(--lxs-accent);
    opacity: 0.22;
  }
  .art .pool {
    fill: var(--lxs-accent);
    opacity: 0.3;
  }
  .art .pointer {
    fill: var(--lxs-text);
    stroke: var(--lxs-bg);
    stroke-width: 1;
  }
  .art .panel {
    fill: var(--lxs-surface-1);
    stroke: var(--lxs-line);
  }
  .art .card {
    fill: var(--lxs-surface-3);
  }
  .art .card.selected,
  .art .knob,
  .art .dot,
  .art .mover {
    fill: var(--lxs-accent);
  }
  .art .outline,
  .art .ring {
    fill: none;
    stroke: var(--lxs-accent);
    stroke-width: 1.5;
  }
  .art .arc,
  .art .guide {
    fill: none;
    stroke: var(--lxs-text-muted);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
  }
  .art .guide {
    stroke: var(--lxs-guide);
  }
  .art .tick {
    fill: var(--lxs-text-faint);
  }
  .art .undo {
    fill: none;
    stroke: var(--lxs-accent);
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
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
    font: 700 11px var(--lxs-font-ui);
  }
  .art .lobe {
    fill: var(--lxs-accent);
    opacity: 0.35;
  }

  /* Motion. transform-box keeps transform-origin relative to each shape. */
  .art * {
    transform-box: fill-box;
  }
  .welcome .glow .beam,
  .welcome .glow .pool {
    animation: glow 3s ease-in-out infinite alternate;
  }
  .add .fly {
    animation: fly 4s ease-in-out infinite;
  }
  .add .appear {
    animation: appear 4s ease-in-out infinite;
  }
  .move .slide {
    animation: slide 4s ease-in-out infinite;
  }
  .aim .swing {
    transform-origin: 50% 0%;
    animation: swing 4s ease-in-out infinite;
  }
  .light .knob {
    animation: knob 4s ease-in-out infinite;
  }
  .light .tint {
    animation: tint 4s ease-in-out infinite;
  }
  .view .orbit {
    transform-origin: 50% 50%;
    animation: orbit 5s ease-in-out infinite;
  }
  .view .mover {
    animation: mover 5s ease-in-out infinite;
  }
  .precision .step {
    animation: step 4s steps(4, jump-none) infinite;
  }
  .precision .guide {
    animation: guide 4s steps(4, jump-none) infinite;
  }
  .precision .undo {
    transform-origin: 50% 50%;
    animation: undo 4s ease-in-out infinite;
  }
  .ies .drop {
    animation: drop 4s ease-in-out infinite;
  }
  .ies .lobe {
    transform-origin: 50% 0%;
    animation: lobe 4s ease-in-out infinite;
  }

  @keyframes glow {
    from {
      opacity: 0.12;
    }
    to {
      opacity: 0.4;
    }
  }
  @keyframes fly {
    0%,
    10% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    50% {
      transform: translate(100px, -14px) scale(0.5);
      opacity: 1;
    }
    60%,
    100% {
      transform: translate(100px, -14px) scale(0.5);
      opacity: 0;
    }
  }
  @keyframes appear {
    0%,
    50% {
      opacity: 0;
    }
    65%,
    100% {
      opacity: 1;
    }
  }
  @keyframes slide {
    0%,
    10% {
      transform: translateX(0);
    }
    50%,
    60% {
      transform: translateX(60px);
    }
    100% {
      transform: translateX(0);
    }
  }
  @keyframes swing {
    0%,
    100% {
      transform: rotate(18deg);
    }
    50% {
      transform: rotate(-18deg);
    }
  }
  @keyframes knob {
    0%,
    100% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(80px);
    }
  }
  @keyframes tint {
    0%,
    100% {
      opacity: 0.08;
      fill: var(--lxs-cct-warm);
    }
    50% {
      opacity: 0.4;
      fill: var(--lxs-cct-cool);
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
  @keyframes mover {
    0%,
    100% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(120px) translateY(-10px);
    }
  }
  @keyframes step {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(80px);
    }
  }
  @keyframes guide {
    0%,
    74% {
      opacity: 0;
    }
    75%,
    100% {
      opacity: 1;
    }
  }
  @keyframes undo {
    0%,
    70%,
    100% {
      transform: rotate(0deg);
    }
    85% {
      transform: rotate(-40deg);
    }
  }
  @keyframes drop {
    0% {
      transform: translateY(-40px);
      opacity: 0;
    }
    30%,
    60% {
      transform: translateY(0);
      opacity: 1;
    }
    75%,
    100% {
      transform: translateY(10px);
      opacity: 0;
    }
  }
  @keyframes lobe {
    0%,
    60% {
      transform: scale(0.2);
      opacity: 0;
    }
    80%,
    100% {
      transform: scale(1);
      opacity: 0.35;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .art * {
      animation: none !important;
    }
  }
`;

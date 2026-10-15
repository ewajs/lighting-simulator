// A scene's floor plan as a small SVG, seen from above: the room, the
// furniture's footprints and the luminaires as dots. New shows it for
// templates that come without a picture (ADR 0052).

import type { Scene } from '@luxstudio/core';
import { svg } from 'lit';

/** Space around the room, as a share of its larger side. */
const MARGIN_SHARE = 0.06;
/** A luminaire's dot, in m: big enough to see in a card. */
const LUMINAIRE_RADIUS_M = 0.09;

/**
 * The plan, in metres: x to the right, z down (the back wall at the top, as
 * in the Plan view). Style it with the `room`, `piece` and `light` classes.
 */
export function scenePlan({ room, luminaires, furniture }: Scene) {
  const { width, depth } = room;
  const margin = Math.max(width, depth) * MARGIN_SHARE;
  const viewBox = [
    -width / 2 - margin,
    -depth / 2 - margin,
    width + 2 * margin,
    depth + 2 * margin,
  ];
  return svg`<svg viewBox=${viewBox.join(' ')} role="img" aria-hidden="true">
    <rect class="room" x=${-width / 2} y=${-depth / 2} width=${width} height=${depth} />
    ${furniture.map(
      ({ position, size, rotationDeg }) =>
        // SVG turns clockwise with z down; a piece's rotation turns its front from +z towards +x.
        svg`<rect
          class="piece"
          x=${-size.width / 2}
          y=${-size.depth / 2}
          width=${size.width}
          height=${size.depth}
          transform="translate(${position.x} ${position.z}) rotate(${-rotationDeg})"
        />`,
    )}
    ${luminaires.map(
      ({ position }) =>
        svg`<circle class="light" cx=${position.x} cy=${position.z} r=${LUMINAIRE_RADIUS_M} />`,
    )}
  </svg>`;
}

// Helpers for the interactive diagrams (ADR 0059): dragging a handle with a
// mouse, a pen or a finger, and looking values up in tables computed at build
// time. Plain functions, type-checked here rather than inside the .vue files.
import type { IntensityGrid } from './directions.data';

/** A point in a diagram's own units: x, then y. */
export type XY = [number, number];

/** Radians per degree. */
export const DEG = Math.PI / 180;

/** `value` kept within [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Where a drag is: as it starts, then as it moves. */
export type DragPhase = 'start' | 'move';

/**
 * Pointer handlers for a draggable SVG element, to bind with `v-on`. They
 * report the pointer in the SVG's own units (its viewBox), however the SVG is
 * scaled on the page. The element keeps the pointer until it's released, so
 * a drag survives leaving it.
 */
export function dragHandlers(move: (at: XY, phase: DragPhase) => void) {
  let pointerId: number | undefined;
  return {
    pointerdown(event: PointerEvent) {
      const element = event.currentTarget as SVGGraphicsElement;
      element.setPointerCapture(event.pointerId);
      pointerId = event.pointerId;
      event.preventDefault();
      move(pointerIn(element, event), 'start');
    },
    pointermove(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
      move(pointerIn(event.currentTarget as SVGGraphicsElement, event), 'move');
    },
    pointerup(event: PointerEvent) {
      if (event.pointerId === pointerId) pointerId = undefined;
    },
    pointercancel(event: PointerEvent) {
      if (event.pointerId === pointerId) pointerId = undefined;
    },
    // A finger on a handle drags it rather than scrolling the page. CSS's
    // touch-action does the same, but browsers don't all honour it inside an SVG.
    touchstart(event: TouchEvent) {
      event.preventDefault();
    },
  };
}

/** The pointer's position in the units of the SVG that holds `element`. */
function pointerIn(element: SVGGraphicsElement, event: PointerEvent): XY {
  const svg = element instanceof SVGSVGElement ? element : element.ownerSVGElement;
  const matrix = svg?.getScreenCTM();
  if (!matrix) return [0, 0];
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  return [point.x, point.y];
}

/**
 * The value at `x` in a table of (x, value) pairs sorted by x, in a straight
 * line between neighbours, and the end values beyond the table.
 */
export function lookUp(table: readonly XY[], x: number): number {
  const last = table.length - 1;
  if (x <= table[0]![0]) return table[0]![1];
  if (x >= table[last]![0]) return table[last]![1];
  const upper = table.findIndex(([at]) => at >= x);
  const [x0, y0] = table[upper - 1]!;
  const [x1, y1] = table[upper]!;
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

/**
 * The intensity in the direction (C, γ), in cd, from a grid computed by core
 * at build time: in straight lines between its four nearest values, as core
 * itself interpolates between a file's measured angles.
 */
export function candelaAtDirection(grid: IntensityGrid, cDeg: number, gammaDeg: number): number {
  const c = (((cDeg % 360) + 360) % 360) / grid.stepCDeg;
  const g = clamp(gammaDeg, 0, 180) / grid.stepGammaDeg;
  const rows = grid.candela;
  const c0 = Math.min(Math.floor(c), rows.length - 2);
  const g0 = Math.min(Math.floor(g), rows[0]!.length - 2);
  const [tc, tg] = [c - c0, g - g0];
  const at = (i: number, j: number) => rows[c0 + i]![g0 + j]!;
  const lower = at(0, 0) + tg * (at(0, 1) - at(0, 0));
  const upper = at(1, 0) + tg * (at(1, 1) - at(1, 0));
  return lower + tc * (upper - lower);
}

/**
 * The SVG path of an arc of radius `r` round (cx, cy), from `fromRad` turning
 * by `sweepRad`. Angles are on screen, from straight down, positive towards
 * the right (counter-clockwise as seen), as the diagrams measure γ.
 */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  fromRad: number,
  sweepRad: number,
): string {
  const point = (a: number) =>
    `${(cx + r * Math.sin(a)).toFixed(2)},${(cy + r * Math.cos(a)).toFixed(2)}`;
  const large = Math.abs(sweepRad) > Math.PI ? 1 : 0;
  // SVG's sweep flag 1 turns clockwise on screen, the way our angles decrease.
  const sweep = sweepRad > 0 ? 0 : 1;
  return `M${point(fromRad)} A${r},${r} 0 ${large} ${sweep} ${point(fromRad + sweepRad)}`;
}

/** The screen angle of a direction given in world units (y up): from straight down, positive to the right. */
export function screenAngle(dx: number, dy: number): number {
  return Math.atan2(dx, -dy);
}

/** The turn from angle `a` to angle `b`, in radians, the short way round: within (−π, π]. */
export function turn(a: number, b: number): number {
  const d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) return d - 2 * Math.PI;
  if (d <= -Math.PI) return d + 2 * Math.PI;
  return d;
}

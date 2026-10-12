// Pointer input on the viewport's canvas: clicks and taps, long presses, and
// drags of fixtures. Kept apart from Viewport so that one stays about drawing.

import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { MoveAxis } from '../move-handle';
import type { AimPart } from './AimHandle';

/** Pointer movement allowed for a press to still count as a click or tap, in px. Fingers wobble more than mice. */
const TAP_TOLERANCE_PX = { mouse: 4, other: 10 };
/** `PointerEvent.button` of the main button: left mouse button, touch or pen contact. */
const MAIN_BUTTON = 0;
/** How long a touch or pen must stay still to count as a long press, in ms. */
export const LONG_PRESS_MS = 500;

/** Something under the pointer that can be dragged: a fixture, or part of a handle. */
export type PressTarget =
  | { readonly kind: 'luminaire'; readonly luminaireId: string }
  | { readonly kind: 'move-axis'; readonly axis: MoveAxis }
  | { readonly kind: 'aim'; readonly part: AimPart };

/** What the gestures do, supplied by the Viewport. */
export interface GestureActions {
  /** What is under a screen point, if anything can be dragged there. */
  targetAt(clientX: number, clientY: number): PressTarget | null;
  /** The mouse is over `target`, or over nothing draggable (null). Also called when a drag ends. */
  hover(target: PressTarget | null): void;
  /** A click or tap, or a long press (touch and pen) while the finger is still down. */
  pick(event: PointerEvent, longPress: boolean): void;
  /**
   * A press on a target moved past the tap tolerance. Returns what to call
   * with each pointer move from then on, or undefined to drop the press.
   */
  startDrag(
    target: PressTarget,
    press: PointerEvent,
    move: PointerEvent,
  ): ((move: PointerEvent) => void) | undefined;
}

/** A press in progress: a click or tap until it moves too far, then a drag if it started on a fixture. */
interface Press {
  readonly event: PointerEvent;
  readonly timer: number | undefined;
  /** What was under the pointer when pressed, if anything. */
  readonly target: PressTarget | null;
  longPressed: boolean;
  dragTo?: (move: PointerEvent) => void;
}

/**
 * Turns pointer events on the canvas into picks, long presses, and drags of
 * fixtures and handles. A press on either switches OrbitControls off until it
 * ends, so dragging them never turns the camera.
 */
export class PointerGestures {
  readonly #canvas: HTMLCanvasElement;
  readonly #container: HTMLElement;
  readonly #controls: OrbitControls;
  readonly #actions: GestureActions;
  #press: Press | undefined;

  /** `container` must be an ancestor of `canvas`; presses are caught there first. */
  constructor(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    controls: OrbitControls,
    actions: GestureActions,
  ) {
    this.#canvas = canvas;
    this.#container = container;
    this.#controls = controls;
    this.#actions = actions;
    // Captured on the container so it runs before OrbitControls' own listener on the canvas.
    container.addEventListener('pointerdown', this.#onPointerDown, { capture: true });
    canvas.addEventListener('pointermove', this.#onPointerMove);
    canvas.addEventListener('pointerup', this.#onPointerUp);
    canvas.addEventListener('pointercancel', this.#endPress);
  }

  dispose(): void {
    this.#endPress();
    this.#container.removeEventListener('pointerdown', this.#onPointerDown, { capture: true });
    this.#canvas.removeEventListener('pointermove', this.#onPointerMove);
    this.#canvas.removeEventListener('pointerup', this.#onPointerUp);
    this.#canvas.removeEventListener('pointercancel', this.#endPress);
  }

  /**
   * A press becomes a pick (on release), a long press (after LONG_PRESS_MS,
   * touch and pen only) or, if it started on a fixture or handle and moves, a
   * drag. Presses on a handle are never picks.
   */
  readonly #onPointerDown = (event: PointerEvent): void => {
    if (event.target !== this.#canvas) return;
    this.#endPress();
    // A second finger means pinch or two-finger pan, never a pick.
    if (!event.isPrimary) return;
    const target =
      event.button === MAIN_BUTTON ? this.#actions.targetAt(event.clientX, event.clientY) : null;
    // Decided before OrbitControls sees the press: on a fixture or handle the camera stays put.
    this.#controls.enabled = target === null;
    const timer =
      event.pointerType === 'mouse' || isHandle(target)
        ? undefined
        : window.setTimeout(() => {
            if (!this.#press) return;
            this.#press.longPressed = true;
            this.#actions.pick(event, true);
          }, LONG_PRESS_MS);
    this.#press = { event, timer, target, longPressed: false };
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    const press = this.#press;
    if (!press) {
      if (event.pointerType === 'mouse') this.#showHover(event);
      return;
    }
    if (event.pointerId !== press.event.pointerId) return;
    if (press.dragTo) return press.dragTo(event);
    if (!this.#movedTooFar(press.event, event)) return;
    if (press.target && !press.longPressed) this.#startDrag(press, press.target, event);
    else this.#endPress();
  };

  readonly #onPointerUp = (event: PointerEvent): void => {
    const press = this.#press;
    if (press && event.pointerId !== press.event.pointerId) return;
    this.#endPress();
    if (!press || press.dragTo || press.longPressed || isHandle(press.target)) return;
    if (this.#movedTooFar(press.event, event)) return;
    this.#actions.pick(event, false);
  };

  readonly #endPress = (): void => {
    window.clearTimeout(this.#press?.timer);
    if (this.#press?.dragTo) {
      this.#canvas.style.cursor = '';
      this.#actions.hover(null);
    }
    this.#press = undefined;
    this.#controls.enabled = true;
  };

  #startDrag(press: Press, target: PressTarget, event: PointerEvent): void {
    window.clearTimeout(press.timer);
    const dragTo = this.#actions.startDrag(target, press.event, event);
    if (!dragTo) return this.#endPress();
    press.dragTo = dragTo;
    // Keep receiving moves when the pointer leaves the canvas.
    this.#canvas.setPointerCapture(event.pointerId);
    this.#canvas.style.cursor = 'grabbing';
    dragTo(event);
  }

  /** With a mouse, fixtures and handles show they can be grabbed. */
  #showHover(event: PointerEvent): void {
    const target = this.#actions.targetAt(event.clientX, event.clientY);
    this.#canvas.style.cursor = target ? 'grab' : '';
    this.#actions.hover(target);
  }

  #movedTooFar(from: PointerEvent, to: PointerEvent): boolean {
    const tolerance =
      from.pointerType === 'mouse' ? TAP_TOLERANCE_PX.mouse : TAP_TOLERANCE_PX.other;
    return Math.hypot(to.clientX - from.clientX, to.clientY - from.clientY) > tolerance;
  }
}

function isHandle(target: PressTarget | null): boolean {
  return target !== null && target.kind !== 'luminaire';
}

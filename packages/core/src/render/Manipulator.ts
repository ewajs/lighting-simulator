// Direct manipulation in the viewport: the move and aim handles on the
// highlighted luminaires, what a press lands on, and the drags that follow.
// Kept apart from Viewport so that one stays about drawing (ADRs 0038–0040).

import * as THREE from 'three/webgpu';
import { AimPointDrag, beamHit, isAimable, PanDrag } from '../aim';
import { LuminaireDrag } from '../drag';
import { AxisDrag, groupAxes, groupCenter } from '../move-handle';
import type { Ray } from '../placement';
import type { Simulator } from '../simulator';
import { AimHandle } from './AimHandle';
import { MoveHandle } from './MoveHandle';
import type { PressTarget } from './PointerGestures';

/**
 * Which handle the viewport shows on highlighted luminaires: arrows to move
 * them, or the aim point and rotation ring for one aimable luminaire.
 */
export type HandleMode = 'move' | 'aim' | 'none';

/** A press on a luminaire started moving it. */
export interface MoveStartEvent {
  readonly luminaireId: string;
  /** The pointer move that started it. */
  readonly event: PointerEvent;
}

/** What the Manipulator uses from the Viewport. */
export interface ManipulatorOptions {
  readonly simulator: Simulator;
  readonly camera: THREE.PerspectiveCamera;
  /** A ray through a screen point, with world matrices up to date. */
  raycasterAt(clientX: number, clientY: number): THREE.Raycaster;
  /** The fixture a ray hits first, if any. */
  luminaireAt(raycaster: THREE.Raycaster): string | null;
  /** The viewport's height in CSS px, for handles that keep their size on screen. */
  viewportHeightPx(): number;
}

/** Handles and drags for the highlighted luminaires. Add `group` to the scene. */
export class Manipulator {
  /** Everything it draws, hidden together for screenshots. */
  readonly group = new THREE.Group();
  readonly #options: ManipulatorOptions;
  readonly #moveHandle = new MoveHandle();
  readonly #aimHandle = new AimHandle();
  readonly #moveStartListeners = new Set<(start: MoveStartEvent) => void>();
  #highlighted: readonly string[] = [];
  #mode: HandleMode = 'none';

  constructor(options: ManipulatorOptions) {
    this.#options = options;
    this.group.add(this.#moveHandle.group, this.#aimHandle.group);
  }

  get mode(): HandleMode {
    return this.#mode;
  }

  set mode(mode: HandleMode) {
    this.#mode = mode;
    this.refresh();
  }

  /** The luminaires the handles act on, and that move together when one is dragged. */
  setHighlighted(ids: readonly string[]): void {
    this.#highlighted = ids;
    this.refresh();
  }

  /** Calls `listener` when dragging a luminaire starts. Returns an unsubscribe function. */
  onMoveStart(listener: (start: MoveStartEvent) => void): () => void {
    this.#moveStartListeners.add(listener);
    return () => this.#moveStartListeners.delete(listener);
  }

  /** Puts the handle of the current mode on the highlighted luminaires. Call after scene changes. */
  refresh(): void {
    const { scene, catalog } = this.#options.simulator;
    const { luminaires, room } = scene;
    const selected = luminaires.filter((l) => this.#highlighted.includes(l.id));
    const product = (id: string) => catalog.get(id);

    const moving = this.#mode === 'move' && selected.length > 0;
    if (moving) this.#moveHandle.show(groupCenter(selected), groupAxes(selected, product, room));
    else this.#moveHandle.show(null, []);

    const aimed = this.#mode === 'aim' && selected.length === 1 ? selected[0] : undefined;
    const aimedProduct = aimed && product(aimed.productId);
    if (aimed && aimedProduct && isAimable(aimedProduct)) {
      this.#aimHandle.show(aimed.position, beamHit(aimed.position, aimed.aim, room));
    } else {
      this.#aimHandle.show(null);
    }
    // Sized now, not on the next frame, so they can be grabbed straight away.
    this.updateSizes();
  }

  /** Keeps the handles a constant size on screen. Call before each render. */
  updateSizes(): void {
    const heightPx = this.#options.viewportHeightPx();
    this.#moveHandle.update(this.#options.camera, heightPx);
    this.#aimHandle.update(this.#options.camera, heightPx);
  }

  /** The handle part or fixture under a screen point. Handles are drawn on top, so they win. */
  targetAt(clientX: number, clientY: number): PressTarget | null {
    const raycaster = this.#options.raycasterAt(clientX, clientY);
    const axis = this.#moveHandle.axisAt(raycaster);
    if (axis) return { kind: 'move-axis', axis };
    const part = this.#aimHandle.partAt(raycaster);
    if (part) return { kind: 'aim', part };
    const luminaireId = this.#options.luminaireAt(raycaster);
    return luminaireId ? { kind: 'luminaire', luminaireId } : null;
  }

  /** Highlights the handle part under the mouse or being dragged; null clears it. */
  hover(target: PressTarget | null): void {
    this.#moveHandle.setActive(target?.kind === 'move-axis' ? target.axis : null);
    this.#aimHandle.setActive(target?.kind === 'aim' ? target.part : null);
  }

  /**
   * Starts a drag. A fixture moves with the other highlighted ones if it is
   * highlighted, otherwise alone (ADR 0038). A move arrow slides all
   * highlighted ones along its axis (ADR 0039). The aim point and ring turn
   * the one highlighted luminaire (ADR 0040). Returns how to follow the pointer.
   */
  startDrag(
    target: PressTarget,
    press: PointerEvent,
    move: PointerEvent,
  ): ((move: PointerEvent) => void) | undefined {
    const { simulator } = this.#options;
    const grabbed = this.#rayAt(press);
    const [highlighted] = this.#highlighted;
    let drag: { moveTo(ray: Ray): void };
    if (target.kind === 'move-axis') {
      drag = new AxisDrag(simulator, this.#highlighted, target.axis, grabbed);
    } else if (target.kind === 'aim' && highlighted) {
      drag =
        target.part === 'point'
          ? new AimPointDrag(simulator, highlighted)
          : new PanDrag(simulator, highlighted, grabbed);
    } else if (target.kind === 'luminaire') {
      const { luminaireId } = target;
      // Undo or delete may have removed it since the press.
      if (!simulator.scene.luminaires.some((l) => l.id === luminaireId)) return undefined;
      const group = this.#highlighted.includes(luminaireId) ? this.#highlighted : [luminaireId];
      drag = new LuminaireDrag(simulator, luminaireId, group, grabbed);
      this.#moveStartListeners.forEach((listener) => listener({ luminaireId, event: move }));
    } else {
      return undefined;
    }
    this.hover(target);
    return (event) => drag.moveTo(this.#rayAt(event));
  }

  dispose(): void {
    this.#moveHandle.dispose();
    this.#aimHandle.dispose();
  }

  #rayAt(event: PointerEvent): Ray {
    return this.#options.raycasterAt(event.clientX, event.clientY).ray;
  }
}

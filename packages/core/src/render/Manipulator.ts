// Direct manipulation in the viewport: the move and aim handles on the
// highlighted luminaires, what a press lands on, and the drags that follow.
// Kept apart from Viewport so that one stays about drawing (ADRs 0038–0042).

import * as THREE from 'three/webgpu';
import { AimPointDrag, beamHit, isAimable, PanDrag } from '../aim';
import { LuminaireDrag } from '../drag';
import {
  groupDimensions,
  luminaireDimensions,
  type Dimension,
  type MeasuredLuminaire,
} from '../measure';
import { AxisDrag, groupAxes, groupCenter } from '../move-handle';
import type { Ray } from '../placement';
import type { Simulator } from '../simulator';
import type { Guide, SnapOptions } from '../snap';
import type { Vec3 } from '../types';
import { AimHandle } from './AimHandle';
import { DimensionLines } from './DimensionLines';
import { MoveHandle } from './MoveHandle';
import { worldPerPixel } from './overlay';
import type { PressTarget } from './PointerGestures';
import { SnapGuides } from './SnapGuides';

/** How close on screen counts as lined up with another luminaire, in CSS px. */
const ALIGN_TOLERANCE_PX = 8;

/** A drag in progress: follows the pointer and reports what it lined up with. */
interface Drag {
  moveTo(ray: Ray, snap: SnapOptions | null): readonly Guide[] | void;
}

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
  /** The fixture under a screen point, if any. */
  luminaireAt(clientX: number, clientY: number): string | null;
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
  readonly #guides = new SnapGuides();
  readonly #dimensionLines = new DimensionLines();
  #dimensions: readonly Dimension[] = [];
  readonly #moveStartListeners = new Set<(start: MoveStartEvent) => void>();
  #highlighted: readonly string[] = [];
  #mode: HandleMode = 'none';
  /** Whether drags snap (ADR 0041). Holding Alt during a drag moves freely. */
  snapping = true;

  constructor(options: ManipulatorOptions) {
    this.#options = options;
    this.group.add(
      this.#moveHandle.group,
      this.#aimHandle.group,
      this.#guides.group,
      this.#dimensionLines.object,
    );
  }

  /** Distances from what is being moved to the walls and floor; empty when nothing is (ADR 0042). */
  get dimensions(): readonly Dimension[] {
    return this.#dimensions;
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
    const luminaireId = this.#options.luminaireAt(clientX, clientY);
    return luminaireId ? { kind: 'luminaire', luminaireId } : null;
  }

  /**
   * Highlights the handle part under the mouse or being dragged. Null clears
   * it, the snap guides and the dimensions: it's also called when a drag ends.
   */
  hover(target: PressTarget | null): void {
    this.#moveHandle.setActive(target?.kind === 'move-axis' ? target.axis : null);
    this.#aimHandle.setActive(target?.kind === 'aim' ? target.part : null);
    if (target) return;
    this.#guides.show([], 0, this.#options.simulator.scene.room);
    this.#showDimensions([]);
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
    let drag: Drag;
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
    // Where the drag is measured: the grabbed luminaire, or the handle's centre.
    const anchorId = target.kind === 'luminaire' ? target.luminaireId : undefined;
    return (event) => {
      const anchor = this.#anchor(anchorId);
      const snap =
        this.snapping && !event.altKey && anchor ? { toleranceM: this.#toleranceAt(anchor) } : null;
      const guides = drag.moveTo(this.#rayAt(event), snap) ?? [];
      this.#guides.show(guides, this.#anchor(anchorId)?.y ?? 0, simulator.scene.room);
      this.#showDimensions(this.#measure(target));
    };
  }

  /** What a drag measures: the grabbed luminaire, or the group moved by an arrow. Aiming measures nothing. */
  #measure(target: PressTarget): Dimension[] {
    const { scene, catalog } = this.#options.simulator;
    const ids = target.kind === 'luminaire' ? [target.luminaireId] : this.#highlighted;
    const measured: MeasuredLuminaire[] = [];
    for (const { id, productId, position } of scene.luminaires) {
      const mount = ids.includes(id) ? catalog.get(productId)?.mount : undefined;
      if (mount) measured.push({ position, mount });
    }
    if (target.kind === 'luminaire' && measured[0]) {
      return luminaireDimensions(measured[0], scene.room, false);
    }
    if (target.kind === 'move-axis')
      return groupDimensions(measured, scene.room, target.axis === 'y');
    return [];
  }

  #showDimensions(dimensions: readonly Dimension[]): void {
    this.#dimensions = dimensions;
    this.#dimensionLines.show(dimensions);
  }

  /** The grabbed luminaire's position, or the centre of the highlighted ones. */
  #anchor(luminaireId: string | undefined): Vec3 | undefined {
    const { luminaires } = this.#options.simulator.scene;
    if (luminaireId) return luminaires.find((l) => l.id === luminaireId)?.position;
    const selected = luminaires.filter((l) => this.#highlighted.includes(l.id));
    return selected.length > 0 ? groupCenter(selected) : undefined;
  }

  /** ALIGN_TOLERANCE_PX in metres at `point`'s distance from the camera. */
  #toleranceAt(point: Vec3): number {
    const at = new THREE.Vector3(point.x, point.y, point.z);
    const heightPx = this.#options.viewportHeightPx();
    return ALIGN_TOLERANCE_PX * worldPerPixel(this.#options.camera, at, heightPx);
  }

  dispose(): void {
    this.#moveHandle.dispose();
    this.#aimHandle.dispose();
    this.#guides.dispose();
    this.#dimensionLines.dispose();
  }

  #rayAt(event: PointerEvent): Ray {
    return this.#options.raycasterAt(event.clientX, event.clientY).ray;
  }
}

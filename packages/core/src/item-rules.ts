// How luminaires and furniture move, one set of rules per kind (ADR 0048):
// where each item can be, which axes it slides along, and how a move is
// applied. Dragging an item and the move arrows both go through these.

import { constrainFurniture } from './furniture';
import { FURNITURE_TYPES } from './furniture-kinds';
import type { MoveAxis } from './move-handle';
import { constrainPosition, wallNormalAxis } from './placement';
import type { EditOptions, Simulator } from './simulator';
import type { Furniture, ItemKind, Product, Room, Vec3 } from './types';

/** How the items of one kind move. Unknown ids are ignored. */
export interface ItemRules {
  /** Every item of this kind, with its id and position. */
  items(): readonly { readonly id: string; readonly position: Vec3 }[];
  /** The nearest position to `position` that item `id` can take. */
  constrain(id: string, position: Vec3): Vec3;
  /** The axes item `id` can slide along at `position`; none if it's unknown. */
  axes(id: string, position: Vec3): MoveAxis[];
  /** Moves item `id` to `position`, as an edit with `options`. */
  move(id: string, position: Vec3, options: EditOptions): void;
}

/** The rules for luminaires or furniture in `simulator`'s scene, read as it changes. */
export function itemRules(simulator: Simulator, kind: ItemKind): ItemRules {
  const room = () => simulator.scene.room;
  if (kind === 'luminaire') {
    const product = (id: string) => {
      const luminaire = simulator.scene.luminaires.find((l) => l.id === id);
      return luminaire && simulator.catalog.get(luminaire.productId);
    };
    return {
      items: () => simulator.scene.luminaires,
      constrain: (id, position) => constrainPosition(position, product(id), room()),
      axes: (id, position) => {
        const found = product(id);
        return found ? luminaireAxes(found, position, room()) : [];
      },
      move: (id, position, options) => simulator.updateLuminaire(id, { position }, options),
    };
  }
  const piece = (id: string) => simulator.scene.furniture.find((f) => f.id === id);
  return {
    items: () => simulator.scene.furniture,
    constrain: (id, position) => {
      const found = piece(id);
      return found ? constrainFurniture({ ...found, position }, room()).position : position;
    },
    axes: (id, position) => {
      const found = piece(id);
      return found ? furnitureAxes(found, position, room()) : [];
    },
    move: (id, position, options) => simulator.updateFurniture(id, { position }, options),
  };
}

/**
 * The axes a luminaire can slide along: across the ceiling or floor, plus
 * height for pendants; along its wall and up for wall fixtures.
 */
export function luminaireAxes(product: Product, position: Vec3, room: Room): MoveAxis[] {
  switch (product.mount) {
    case 'recessed':
    case 'track':
    case 'floor':
    case 'table':
      return ['x', 'z'];
    case 'pendant':
      return ['x', 'y', 'z'];
    case 'wall':
      return alongWallAndUp(position, room);
  }
}

/** The axes a piece can slide along: across the floor; along its wall and up for wall pieces. */
function furnitureAxes(piece: Furniture, position: Vec3, room: Room): MoveAxis[] {
  return FURNITURE_TYPES[piece.kind].onWall ? alongWallAndUp(position, room) : ['x', 'z'];
}

function alongWallAndUp(position: Vec3, room: Room): MoveAxis[] {
  return [wallNormalAxis(position, room) === 'x' ? 'z' : 'x', 'y'];
}

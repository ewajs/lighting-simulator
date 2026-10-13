// Which builder draws each kind of furniture (ADR 0047).

import type { FurnitureKind } from '../../types';
import { armchair } from './armchair';
import { artwork } from './artwork';
import { bed } from './bed';
import { bookcase } from './bookcase';
import { chair, diningTable } from './dining';
import { displayPlinth } from './display-plinth';
import { officeChair } from './office-chair';
import type { PieceBuilder } from './pieces';
import { plant } from './plant';
import { sofa } from './sofa';
import { coffeeTable, desk, kitchenIsland } from './tables';
import { tvUnit } from './tv-unit';

/** The builder for each kind of piece. */
export const PIECE_BUILDERS: Readonly<Record<FurnitureKind, PieceBuilder>> = {
  sofa,
  armchair,
  'coffee-table': coffeeTable,
  'tv-unit': tvUnit,
  plant,
  'dining-table': diningTable,
  chair,
  desk,
  'office-chair': officeChair,
  bookcase,
  bed,
  'kitchen-island': kitchenIsland,
  'display-plinth': displayPlinth,
  artwork,
};

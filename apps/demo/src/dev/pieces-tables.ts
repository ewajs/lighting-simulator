// Preview entries for the "tables" pieces. Each id renders with ?piece=<id>; all of
// them together with ?group=tables.

import {
  coffeeTable,
  desk,
  kitchenIsland,
} from '../../../../packages/core/src/render/furniture/tables';
import type { PreviewPiece } from './preview-types';

/** The tables and work surfaces, arranged side by side for a group shot. */
export const TABLES: Record<string, PreviewPiece> = {
  coffeeTable: {
    build: coffeeTable,
    size: { width: 1.1, depth: 0.6, height: 0.4 },
    main: 'oak',
    accent: 'walnut',
    at: [-2.5, 0.3],
  },
  desk: {
    build: desk,
    size: { width: 1.4, depth: 0.7, height: 0.75 },
    main: 'white',
    accent: 'oak',
    at: [-0.7, 0],
  },
  kitchenIsland: {
    build: kitchenIsland,
    size: { width: 2.0, depth: 0.65, height: 0.9 },
    main: 'white',
    accent: 'concrete',
    at: [1.4, 0],
  },
};

// Preview entries for the "storage" pieces. Each id renders with ?piece=<id>; all of
// them together with ?group=storage.

import { bookcase } from '../../../../packages/core/src/render/furniture/bookcase';
import { displayPlinth } from '../../../../packages/core/src/render/furniture/display-plinth';
import { tvUnit } from '../../../../packages/core/src/render/furniture/tv-unit';
import type { PreviewPiece } from './preview-types';

export const STORAGE: Record<string, PreviewPiece> = {
  bookcase: {
    build: bookcase,
    size: { width: 1.0, depth: 0.35, height: 2.0 },
    main: 'oak',
    accent: 'white',
    at: [-2.0, -1.35],
  },
  tvUnit: {
    build: tvUnit,
    size: { width: 1.8, depth: 0.42, height: 0.5 },
    main: 'walnut',
    accent: 'oak',
    at: [0.2, -1.35],
  },
  displayPlinth: {
    build: displayPlinth,
    size: { width: 0.5, depth: 0.5, height: 1.0 },
    main: 'white',
    accent: 'concrete',
    at: [2.2, -0.6],
  },
};

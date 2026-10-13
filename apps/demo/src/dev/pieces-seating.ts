// Preview entries for the "seating" pieces. Each id renders with ?piece=<id>; all of
// them together with ?group=seating.

import { armchair } from '../../../../packages/core/src/render/furniture/armchair';
import { officeChair } from '../../../../packages/core/src/render/furniture/office-chair';
import type { PreviewPiece } from './preview-types';

export const SEATING: Record<string, PreviewPiece> = {
  armchair: {
    build: armchair,
    size: { width: 0.85, depth: 0.85, height: 0.8 },
    main: 'linen',
    accent: 'oak',
    at: [-0.7, 0],
    turnDeg: 15,
  },
  officeChair: {
    build: officeChair,
    size: { width: 0.64, depth: 0.64, height: 1.02 },
    main: 'slate',
    accent: 'metal',
    at: [0.7, 0],
    turnDeg: -20,
  },
};

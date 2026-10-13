// The style test's reference pieces: what every other piece should match.

import { chair, diningTable } from '../../../../packages/core/src/render/furniture/dining';
import { plant } from '../../../../packages/core/src/render/furniture/plant';
import { sofa } from '../../../../packages/core/src/render/furniture/sofa';
import type { PreviewPiece } from './preview-types';

const CHAIR = { width: 0.46, depth: 0.5, height: 0.84 };

export const REFERENCE: Record<string, PreviewPiece> = {
  sofa: {
    build: sofa,
    size: { width: 2.1, depth: 0.9, height: 0.8 },
    main: 'linen',
    accent: 'oak',
    at: [-1.3, 0.2],
  },
  table: {
    build: diningTable,
    size: { width: 1.6, depth: 0.9, height: 0.75 },
    main: 'oak',
    accent: 'oak',
    at: [1.4, 0],
  },
  chairA: {
    build: chair,
    size: CHAIR,
    main: 'oak',
    accent: 'linen',
    at: [1.0, 0.62],
    turnDeg: 180,
  },
  chairB: { build: chair, size: CHAIR, main: 'oak', accent: 'linen', at: [1.8, -0.62] },
  plant: {
    build: plant,
    size: { width: 0.4, depth: 0.4, height: 1.1 },
    main: 'leaf',
    accent: 'terracotta',
    at: [-2.75, -0.55],
  },
};

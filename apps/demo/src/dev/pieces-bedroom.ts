// Preview entries for the "bedroom" pieces. Each id renders with ?piece=<id>; all of
// them together with ?group=bedroom.

import { artwork } from '../../../../packages/core/src/render/furniture/artwork';
import { bed } from '../../../../packages/core/src/render/furniture/bed';
import type { PreviewPiece } from './preview-types';

export const BEDROOM: Record<string, PreviewPiece> = {
  bed: {
    build: bed,
    size: { width: 1.6, depth: 2.05, height: 0.5 },
    main: 'linen',
    accent: 'oak',
    // Headboard against the back wall.
    at: [0, -0.55],
  },
  artwork: {
    build: artwork,
    size: { width: 1.0, depth: 0.03, height: 0.7 },
    main: 'walnut',
    accent: 'white',
    onWall: true,
    // Centred above the headboard.
    at: [0, 1.55],
  },
};

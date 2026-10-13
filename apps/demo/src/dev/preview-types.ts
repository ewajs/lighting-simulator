// What the furniture preview page renders (development only, ADR 0047).

import type {
  PieceBuilder,
  PieceSize,
} from '../../../../packages/core/src/render/furniture/pieces';
import type { FinishName } from '../../../../packages/core/src/types';

/** One piece as the preview shows it: builder, size, finishes and where it stands in a group shot. */
export interface PreviewPiece {
  readonly build: PieceBuilder;
  readonly size: PieceSize;
  readonly main: FinishName;
  readonly accent: FinishName;
  /** Position in the group arrangement, in m. */
  readonly at: readonly [x: number, z: number];
  readonly turnDeg?: number;
  /** Mounted on the back wall (artwork): `at` is then x and the height of its centre. */
  readonly onWall?: boolean;
}

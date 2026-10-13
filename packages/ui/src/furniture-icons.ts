// Line icons for the furniture pieces, drawn in Lucide's style (24 × 24,
// round strokes) so they sit beside its icons (ADR 0023). Lucide has no
// icons for most of these pieces.

import type { FurnitureKind } from '@luxstudio/core';
import type { TemplateResult } from 'lit';
import type { IconNode } from 'lucide';
import { icon } from './icons';

const FURNITURE_ICONS: Record<FurnitureKind, IconNode> = {
  sofa: [
    ['path', { d: 'M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3' }],
    ['path', { d: 'M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z' }],
    ['path', { d: 'M5 18v2M19 18v2' }],
  ],
  armchair: [
    ['path', { d: 'M7 11V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3' }],
    ['path', { d: 'M4 13a2 2 0 0 1 4 0v2h8v-2a2 2 0 0 1 4 0v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z' }],
    ['path', { d: 'M7 18v2M17 18v2' }],
  ],
  'coffee-table': [
    ['rect', { x: 2, y: 11, width: 20, height: 2, rx: 1 }],
    ['path', { d: 'M5 13v6M19 13v6M5 17h14' }],
  ],
  'tv-unit': [
    ['rect', { x: 6, y: 2, width: 12, height: 8, rx: 1 }],
    ['path', { d: 'M12 10v3' }],
    ['rect', { x: 3, y: 13, width: 18, height: 6, rx: 1 }],
    ['path', { d: 'M12 13v6M5 19v2M19 19v2' }],
  ],
  plant: [
    ['path', { d: 'M8 15h8l-1 7H9z' }],
    ['path', { d: 'M12 15V3M12 15c-2-2-3-6-2-10M12 15c2-2 3-5 3-8' }],
  ],
  'dining-table': [
    ['rect', { x: 2, y: 8, width: 20, height: 2, rx: 1 }],
    ['path', { d: 'M5 10v11M19 10v11M5 13h14' }],
  ],
  chair: [
    ['path', { d: 'M7 3v18M7 5h4' }],
    ['rect', { x: 7, y: 12, width: 11, height: 2, rx: 1 }],
    ['path', { d: 'M17 14v7' }],
  ],
  desk: [
    ['rect', { x: 2, y: 7, width: 20, height: 2, rx: 1 }],
    ['path', { d: 'M4 9v12M20 9v12' }],
    ['rect', { x: 11, y: 9, width: 7, height: 4, rx: 0.5 }],
    ['path', { d: 'M13.5 11h2' }],
  ],
  'office-chair': [
    ['rect', { x: 7, y: 2, width: 10, height: 8, rx: 2 }],
    ['rect', { x: 5, y: 11, width: 14, height: 3, rx: 1.5 }],
    ['path', { d: 'M12 14v4M6 21l6-3 6 3' }],
  ],
  bookcase: [
    ['rect', { x: 4, y: 2, width: 16, height: 20, rx: 1 }],
    ['path', { d: 'M4 9h16M4 15h16M7 5v4M9 5v4M15 11v4M17 12v3M8 18v4' }],
  ],
  bed: [
    ['path', { d: 'M3 5v15' }],
    ['rect', { x: 3, y: 12, width: 18, height: 4, rx: 1 }],
    ['rect', { x: 5, y: 9, width: 5, height: 3, rx: 1.5 }],
    ['path', { d: 'M20 16v4' }],
  ],
  'kitchen-island': [
    ['rect', { x: 2, y: 5, width: 20, height: 2, rx: 1 }],
    ['rect', { x: 3, y: 7, width: 18, height: 13 }],
    ['path', { d: 'M3 11h18M12 11v9M10 14v2M14 14v2' }],
  ],
  'display-plinth': [
    ['rect', { x: 7, y: 11, width: 10, height: 11, rx: 0.5 }],
    ['path', { d: 'M10.5 11c-1.5-1.5-1.5-4 0-6l.5-2h2l.5 2c1.5 2 1.5 4.5 0 6' }],
  ],
  artwork: [
    ['rect', { x: 3, y: 4, width: 18, height: 15, rx: 1 }],
    ['circle', { cx: 9, cy: 10, r: 2 }],
    ['path', { d: 'M3 16l5-4 4 3 3-2 6 4' }],
  ],
};

/** The line icon for a kind of furniture. */
export const furnitureIcon = (kind: FurnitureKind): TemplateResult => icon(FURNITURE_ICONS[kind]);

import { msg } from '@lit/localize';
import type { FinishName, FurnitureKind, MountType, Scene } from '@luxstudio/core';

/** Translated name of a mount type. A function so it's evaluated at render time. */
export const mountLabel = (mount: MountType): string =>
  ({
    recessed: msg('Recessed'),
    pendant: msg('Pendant'),
    track: msg('Track'),
    wall: msg('Wall'),
    floor: msg('Floor lamp'),
    table: msg('Table lamp'),
  })[mount];

/** Translated name of a kind of furniture. */
export const furnitureLabel = (kind: FurnitureKind): string =>
  ({
    sofa: msg('Sofa'),
    armchair: msg('Armchair'),
    'coffee-table': msg('Coffee table'),
    'tv-unit': msg('TV unit'),
    plant: msg('Plant'),
    'dining-table': msg('Dining table'),
    chair: msg('Chair'),
    desk: msg('Desk'),
    'office-chair': msg('Office chair'),
    bookcase: msg('Bookcase'),
    bed: msg('Bed'),
    'kitchen-island': msg('Kitchen island'),
    'display-plinth': msg('Display plinth'),
    artwork: msg('Artwork'),
  })[kind];

/** Translated name of a furniture finish. */
export const finishLabel = (finish: FinishName): string =>
  ({
    oak: msg('Oak'),
    walnut: msg('Walnut'),
    white: msg('White'),
    charcoal: msg('Charcoal'),
    metal: msg('Metal'),
    linen: msg('Linen'),
    slate: msg('Slate'),
    concrete: msg('Concrete'),
    terracotta: msg('Terracotta'),
    leaf: msg('Green'),
    leafLight: msg('Light green'),
    soil: msg('Soil'),
  })[finish];

/** What a piece's main and accent finishes cover, e.g. a sofa's upholstery and legs. */
export const finishPartLabels = (kind: FurnitureKind): { main: string; accent: string } =>
  ({
    sofa: { main: msg('Upholstery'), accent: msg('Legs') },
    armchair: { main: msg('Upholstery'), accent: msg('Legs') },
    'coffee-table': { main: msg('Top'), accent: msg('Shelf') },
    'tv-unit': { main: msg('Cabinet'), accent: msg('Legs') },
    plant: { main: '', accent: msg('Pot') },
    'dining-table': { main: msg('Wood'), accent: '' },
    chair: { main: msg('Wood'), accent: msg('Seat') },
    desk: { main: msg('Top'), accent: msg('Legs') },
    'office-chair': { main: msg('Upholstery'), accent: msg('Base') },
    bookcase: { main: msg('Shelves'), accent: msg('Back') },
    bed: { main: msg('Bedding'), accent: msg('Wood') },
    'kitchen-island': { main: msg('Cabinet'), accent: msg('Worktop') },
    'display-plinth': { main: msg('Plinth'), accent: msg('Sculpture') },
    artwork: { main: msg('Frame'), accent: msg('Canvas') },
  })[kind];

/** A display name per piece of furniture: its kind and a number, e.g. "Chair 2". */
export function furnitureNames(scene: Scene): ReadonlyMap<string, string> {
  const counts = new Map<FurnitureKind, number>();
  const names = new Map<string, string>();
  for (const { id, kind } of scene.furniture) {
    const count = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, count);
    names.set(id, `${furnitureLabel(kind)} ${count}`);
  }
  return names;
}

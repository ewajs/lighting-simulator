import { msg } from '@lit/localize';
import type { MountType } from '@luxstudio/core';

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

// Where a fixture's light comes from and what turns with the aim: plain data
// shared by the renderer and the illuminance calculation, so the picture and
// the numbers agree (ADR 0057). A model says it with its `light` and `head`
// nodes (ADR 0043); a product without one gets its placeholder's layout.

import { glbNodePositions } from './glb';
import type { MountType, Product, Vec3 } from './types';

/** Default height of a floor lamp when the product doesn't say, in m. */
export const FLOOR_LAMP_HEIGHT = 1.5;
/** Default height of a table lamp when the product doesn't say, in m. */
export const TABLE_LAMP_HEIGHT = 0.45;
/** A lamp's light sits in its shade, at this share of its height. */
export const LAMP_SHADE_HEIGHT_SHARE = 0.85;
/** A placeholder track head turns about this point below the rail, in m. */
export const TRACK_HEAD_PIVOT_Y = -0.1;

// Model conventions (ADR 0043).
/** Node marking where the light sits; default: the model's origin. */
export const LIGHT_NODE = 'light';
/** Node that turns with the aim. */
export const HEAD_NODE = 'head';

const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * A fixture's layout in its own frame at rest: before the wall turn, pan or
 * tilt, with the luminaire's position at the origin, in m.
 */
export interface FixtureLayout {
  /** Where the light leaves from: its photometric centre. */
  readonly lightOrigin: Vec3;
  /**
   * The point a head turns about with the aim, for fixtures with a head
   * (track spots). The light then moves with the head. Without one, only the
   * light's direction turns.
   */
  readonly headPivot?: Vec3;
}

/**
 * The layout of a product's fixture: from its model file when it has one,
 * otherwise, or if the file can't be read, its placeholder's: the renderer
 * draws the placeholder for a model it can't use.
 */
export function fixtureLayout(product: Product, modelFile?: ArrayBuffer): FixtureLayout {
  if (!modelFile) return placeholderLayout(product.mount);
  try {
    return modelLayout(modelFile);
  } catch {
    return placeholderLayout(product.mount);
  }
}

/**
 * A model's layout, from its `light` and `head` nodes: the light at the
 * model's origin when it has no `light` node.
 *
 * @throws SyntaxError if the file isn't a binary glTF file.
 */
export function modelLayout(file: ArrayBuffer): FixtureLayout {
  const nodes = glbNodePositions(file, [LIGHT_NODE, HEAD_NODE]);
  const head = nodes.get(HEAD_NODE);
  return { lightOrigin: nodes.get(LIGHT_NODE) ?? ORIGIN, ...(head && { headPivot: head }) };
}

/** The layout of the simple placeholder fixture drawn for a mount type without a model. */
export function placeholderLayout(mount: MountType): FixtureLayout {
  switch (mount) {
    case 'recessed':
      return { lightOrigin: { x: 0, y: -0.03, z: 0 } };
    case 'track':
      return {
        lightOrigin: { x: 0, y: -0.18, z: 0 },
        headPivot: { x: 0, y: TRACK_HEAD_PIVOT_Y, z: 0 },
      };
    case 'pendant':
      return { lightOrigin: { x: 0, y: -0.1, z: 0 } };
    case 'wall':
      // In front of the wall: local +z points into the room.
      return { lightOrigin: { x: 0, y: -0.07, z: 0.05 } };
    case 'floor':
      return { lightOrigin: { x: 0, y: FLOOR_LAMP_HEIGHT * LAMP_SHADE_HEIGHT_SHARE, z: 0 } };
    case 'table':
      return { lightOrigin: { x: 0, y: TABLE_LAMP_HEIGHT * LAMP_SHADE_HEIGHT_SHARE, z: 0 } };
  }
}

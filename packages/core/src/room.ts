import { constrainPosition } from './placement';
import type { Catalog, Room, Scene, Surface, SurfaceName } from './types';
import { assertHexColor, assertInRange, assertPositive } from './validate';

/** A 5 × 4 × 2.7 m room with typical interior finishes. */
export const DEFAULT_ROOM: Room = {
  width: 5,
  depth: 4,
  height: 2.7,
  surfaces: {
    floor: { color: '#8a6a4a', reflectance: 0.3 },
    walls: { color: '#f2f0ec', reflectance: 0.8 },
    ceiling: { color: '#f7f6f3', reflectance: 0.85 },
  },
};

/** Room dimensions that can be changed together. */
export type RoomSize = Pick<Room, 'width' | 'depth' | 'height'>;

/** Resizes the room and moves luminaires so they stay valid for their mount type. */
export function resizeRoom(scene: Scene, size: Partial<RoomSize>, catalog: Catalog): Scene {
  const room = { ...scene.room, ...size };
  assertRoomSize(room);
  return {
    room,
    luminaires: scene.luminaires.map((luminaire) => ({
      ...luminaire,
      position: constrainPosition(luminaire.position, catalog.get(luminaire.productId), room),
    })),
  };
}

/** Changes the finish of one surface. */
export function setSurface(scene: Scene, name: SurfaceName, patch: Partial<Surface>): Scene {
  const surface = { ...scene.room.surfaces[name], ...patch };
  assertSurface(name, surface);
  return {
    ...scene,
    room: { ...scene.room, surfaces: { ...scene.room.surfaces, [name]: surface } },
  };
}

export function assertRoom(room: Room): void {
  assertRoomSize(room);
  for (const name of ['floor', 'walls', 'ceiling'] as const)
    assertSurface(name, room.surfaces[name]);
}

function assertRoomSize(size: RoomSize): void {
  assertPositive('room.width', size.width);
  assertPositive('room.depth', size.depth);
  assertPositive('room.height', size.height);
}

function assertSurface(name: SurfaceName, surface: Surface): void {
  assertHexColor(`${name}.color`, surface.color);
  // ρ = 1 would make the inter-reflection estimate diverge (SPEC §6).
  assertInRange(`${name}.reflectance`, surface.reflectance, 0, 0.99);
}

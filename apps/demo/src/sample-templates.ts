import { Simulator, type Aim, type Catalog, type Scene, type Vec3 } from '@luxstudio/core';
import type { RoomTemplate } from '@luxstudio/ui';

type Labels = Record<'es-AR' | 'en', string>;

/** A template with its name in each language. */
interface SampleTemplate {
  readonly id: string;
  readonly name: Labels;
  readonly scene: Scene;
}

const DEG = Math.PI / 180;
/**
 * Where the demo's rooms are: Buenos Aires, 34.6° S (ADR 0079). The library
 * knows no location; New keeps the visitor's own once they change it.
 */
const BUENOS_AIRES_LATITUDE_DEG = -34.6;

/** A scratch simulator to build a template with, its daylight in Buenos Aires. */
function scratch(catalog: Catalog): Simulator {
  const sim = new Simulator({ catalog });
  sim.setDaylight({ latitudeDeg: BUENOS_AIRES_LATITUDE_DEG });
  return sim;
}

/**
 * Room templates for New (ADR 0052), lit by the demo's products. Each is
 * built with a scratch simulator, so placement and aim follow the usual
 * rules; build them once and reuse them, so their ids stay put. The dining
 * room is also the starter scene.
 */
export function sampleTemplates(catalog: Catalog): readonly SampleTemplate[] {
  return [
    { id: 'dining', name: { 'es-AR': 'Comedor', en: 'Dining room' }, scene: diningRoom(catalog) },
    { id: 'living', name: { 'es-AR': 'Living', en: 'Living room' }, scene: livingRoom(catalog) },
    { id: 'bedroom', name: { 'es-AR': 'Dormitorio', en: 'Bedroom' }, scene: bedroom(catalog) },
    {
      id: 'office',
      name: { 'es-AR': 'Oficina en casa', en: 'Home office' },
      scene: homeOffice(catalog),
    },
    { id: 'shop', name: { 'es-AR': 'Local', en: 'Shop' }, scene: shop(catalog) },
  ];
}

/** The templates as New offers them, in the given language. */
export function localizedTemplates(
  templates: readonly SampleTemplate[],
  locale: keyof Labels,
): RoomTemplate[] {
  return templates.map(({ id, name, scene }) => ({ id, name: name[locale], scene }));
}

/**
 * A small dining room with an oak floor, lit by the real IES products: a
 * linear direct/indirect pendant over the dining table, two wall washers on
 * the back wall, a track spot on the picture on the left wall, and an up/down
 * light on the right wall.
 */
function diningRoom(catalog: Catalog): Scene {
  const sim = scratch(catalog);
  sim.setSurface('floor', { texture: 'oak-planks', reflectance: 0.3 });
  sim.addLuminaire('ies-linear-pendant');
  // Pan 180° turns their forward throw (C0, local +z) towards the back wall at z = −2.
  for (const x of [-1.2, 1.2]) {
    sim.addLuminaire('ies-wall-washer', { at: { x, z: -1.5 }, aim: { tiltDeg: 0, panDeg: 180 } });
  }
  // Pan −90° turns the spot towards the left wall at x = −2.5; 50° tilt meets
  // it 1.5 / tan 50° ≈ 1.26 m below the ceiling, at the picture's centre.
  sim.addLuminaire('ies-track-spot', { at: { x: -1, z: 0.8 }, aim: { tiltDeg: 50, panDeg: -90 } });
  sim.addLuminaire('ies-wall-up-down', { at: { x: 2.4, z: 0 } });

  sim.addFurniture('dining-table');
  // Two chairs on each long side, facing the table (a chair faces +z unturned).
  for (const x of [-0.4, 0.4]) {
    sim.addFurniture('chair', { at: { x, z: -0.55 } });
    sim.addFurniture('chair', { at: { x, z: 0.55 }, rotationDeg: 180 });
  }
  sim.addFurniture('artwork', { position: { x: -2.5, y: 1.45, z: 0.8 } });
  sim.addFurniture('plant', { at: { x: 2.1, z: -1.65 } });
  return sim.scene;
}

/**
 * A living room, 5.5 × 4.5 m: a sofa against the back wall facing the TV,
 * a coffee table and an armchair, downlights in a grid, a floor lamp by the
 * sofa and a track spot on the picture above it.
 */
function livingRoom(catalog: Catalog): Scene {
  const sim = scratch(catalog);
  sim.setRoomSize({ width: 5.5, depth: 4.5, height: 2.7 });
  sim.setSurface('floor', { texture: 'oak-planks', reflectance: 0.3 });
  sim.setSurface('walls', { texture: 'plaster', reflectance: 0.75 });

  sim.addFurniture('sofa', { at: { x: 0, z: -1.75 } });
  sim.addFurniture('coffee-table', { at: { x: 0, z: -0.55 } });
  sim.addFurniture('armchair', { at: { x: 1.75, z: -0.5 }, rotationDeg: -90 });
  sim.addFurniture('tv-unit', { at: { x: 0, z: 2.0 }, rotationDeg: 180 });
  sim.addFurniture('plant', { at: { x: -2.4, z: -1.9 } });
  const picture = { x: 0, y: 1.65, z: -2.25 };
  sim.addFurniture('artwork', { position: picture });

  for (const x of [-1.4, 1.4]) {
    for (const z of [-0.8, 1.1]) sim.addLuminaire('ies-downlight', { at: { x, z }, dimming: 0.7 });
  }
  sim.addLuminaire('floor-lamp-9w', { at: { x: -1.5, z: -1.85 } });
  const spot = { x: 0, y: 2.7, z: -0.9 };
  sim.addLuminaire('ies-track-spot', { at: spot, aim: aimAt(spot, picture) });
  return sim.scene;
}

/**
 * A bedroom, 4 × 4 m: a double bed against the back wall with a picture
 * above it and a reading light on each side, a bookcase on the left wall, an
 * armchair with a floor lamp in the front corner, and two dimmed downlights.
 */
function bedroom(catalog: Catalog): Scene {
  const sim = scratch(catalog);
  sim.setRoomSize({ width: 4, depth: 4, height: 2.7 });
  sim.setSurface('floor', { texture: 'oak-planks', reflectance: 0.3 });
  sim.setSurface('walls', { texture: 'plaster', reflectance: 0.75 });

  // The bed's foot faces +z; 2.05 m long, its headboard meets the back wall at z = −2.
  sim.addFurniture('bed', { at: { x: 0, z: -0.95 }, finish: { main: 'linen', accent: 'walnut' } });
  sim.addFurniture('artwork', { position: { x: 0, y: 1.5, z: -2 } });
  sim.addFurniture('bookcase', { at: { x: -1.8, z: 0.9 }, rotationDeg: 90 });
  sim.addFurniture('armchair', { at: { x: 1.35, z: 1.3 }, rotationDeg: -135 });
  sim.addFurniture('plant', { at: { x: 1.7, z: -1.7 } });

  for (const x of [-1.1, 1.1]) sim.addLuminaire('ies-wall-up-down', { at: { x, z: -1.95 } });
  sim.addLuminaire('floor-lamp-9w', { at: { x: 1.75, z: 0.6 } });
  for (const x of [-0.9, 0.9]) {
    sim.addLuminaire('ies-downlight', { at: { x, z: 0.9 }, dimming: 0.5 });
  }
  return sim.scene;
}

/**
 * A home office, 4 × 3.5 m on a concrete floor: a desk facing the back wall
 * under a linear pendant, a bookcase on the left wall, a picture and an
 * up/down light on the back wall beside the desk, and two downlights. (The
 * default view looks through the right wall, so nothing hangs there.)
 */
function homeOffice(catalog: Catalog): Scene {
  const sim = scratch(catalog);
  sim.setRoomSize({ width: 4, depth: 3.5, height: 2.7 });
  sim.setSurface('floor', { texture: 'concrete', reflectance: 0.4 });

  sim.addFurniture('desk', { at: { x: 0, z: -1.3 }, finish: { main: 'oak', accent: 'charcoal' } });
  sim.addFurniture('office-chair', { at: { x: 0, z: -0.6 }, rotationDeg: 180 });
  sim.addFurniture('bookcase', { at: { x: -1.8, z: 0.2 }, rotationDeg: 90 });
  sim.addFurniture('plant', { at: { x: 1.7, z: -1.5 } });
  sim.addFurniture('artwork', { position: { x: -1.3, y: 1.55, z: -1.75 } });

  // The pendant runs along its local z (C0); a quarter pan lays it along the desk.
  sim.addLuminaire('ies-linear-pendant', {
    at: { x: 0, z: -1.3 },
    aim: { tiltDeg: 0, panDeg: 90 },
  });
  sim.addLuminaire('ies-wall-up-down', { at: { x: 1.2, z: -1.7 } });
  for (const x of [-0.9, 0.9]) sim.addLuminaire('downlight-7w', { at: { x, z: 0.9 } });
  return sim.scene;
}

/**
 * A small shop or gallery, 7 × 5 m and 3.2 m high: three display plinths
 * under track spots, two pictures on the back wall under wall washers, a
 * counter and a plant.
 */
function shop(catalog: Catalog): Scene {
  const sim = scratch(catalog);
  sim.setRoomSize({ width: 7, depth: 5, height: 3.2 });
  sim.setSurface('floor', { texture: 'concrete', reflectance: 0.4 });
  sim.setSurface('walls', { color: '#f2f0ec', reflectance: 0.8 });

  const plinths = [
    { x: -2, z: 0.6 },
    { x: 0, z: 1 },
    { x: 2, z: 0.6 },
  ];
  for (const at of plinths) {
    sim.addFurniture('display-plinth', { at, finish: { main: 'white', accent: 'oak' } });
    // From the ceiling 1.2 m behind it, at the top of the plinth (1 m).
    const spot = { x: at.x, y: 3.2, z: at.z - 1.2 };
    sim.addLuminaire('ies-track-spot', { at: spot, aim: aimAt(spot, { ...at, y: 1 }) });
  }
  for (const x of [-1.6, 1.6]) {
    sim.addFurniture('artwork', { position: { x, y: 1.6, z: -2.5 } });
    sim.addLuminaire('ies-wall-washer', { at: { x, z: -1.6 }, aim: { tiltDeg: 0, panDeg: 180 } });
  }
  sim.addFurniture('kitchen-island', { at: { x: 2.3, z: -1.5 }, finish: { main: 'walnut' } });
  sim.addFurniture('plant', { at: { x: -3.1, z: -2.1 } });
  sim.addLuminaire('ies-linear-pendant', {
    at: { x: 2.3, z: -1.5 },
    aim: { tiltDeg: 0, panDeg: 90 },
  });
  return sim.scene;
}

/** The aim that points a luminaire at `from` towards `to`: tilt from straight down, pan from +z. */
function aimAt(from: Vec3, to: Vec3): Aim {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return {
    tiltDeg: Math.atan2(Math.hypot(dx, dz), from.y - to.y) / DEG,
    panDeg: Math.atan2(dx, dz) / DEG,
  };
}

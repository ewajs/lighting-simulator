// The bookcase: open oak shelving with a few books and vessels, arranged
// the same way every time so a scene always looks the same.

import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PieceBuilder } from './pieces';
import { FINISHES } from '../../furniture-kinds';
import type { FinishName } from '../../types';
import { material, panel, PANEL_THICKNESS, type ProfilePoint, solid, turned } from './style';

/** A bellied vase with a narrow neck and a lip turned inwards. */
const VASE_PROFILE: readonly ProfilePoint[] = [
  [0, 0],
  [0.55, 0],
  [0.6, 0.02],
  [0.92, 0.28],
  [1, 0.48],
  [0.86, 0.7],
  [0.5, 0.86],
  [0.42, 0.97],
  [0.44, 1],
  [0.36, 1],
  [0.34, 0.9],
];

/** A shallow open bowl, its wall thickness turned back down inside. */
const BOWL_PROFILE: readonly ProfilePoint[] = [
  [0, 0],
  [0.45, 0],
  [0.5, 0.06],
  [0.86, 0.55],
  [1, 1],
  [0.94, 1],
  [0.8, 0.6],
  [0.45, 0.22],
  [0, 0.18],
];

/** A book: thickness along x, height (or length when lying) and its finish. */
type Book = readonly [thicknessM: number, heightM: number, finish: FinishName];

/** Edge radius of a book, in m: softer than a panel, like a bound cover. */
const BOOK_RADIUS = 0.003;
/** A book's depth as a share of its height (a 24 cm book is ~16 cm deep). */
const BOOK_DEPTH_SHARE = 0.7;
/** How far books stand back from a shelf's front edge, in m. */
const BOOK_SETBACK = 0.025;
/** Space kept above the tallest book, in m, so it can be taken out. */
const BOOK_HEADROOM = 0.035;
/** A leaning book's tilt, in radians. */
const BOOK_LEAN = THREE.MathUtils.degToRad(15);
/** Twist of each book in a lying stack, in radians, so it looks placed by hand. */
const STACK_TWISTS = [0, 0.05, -0.03, 0.07, -0.02] as const;

/** One material per finish for a piece's decor, so its books share them. */
type Paint = (name: FinishName) => THREE.MeshStandardMaterial;

function paintCache(): Paint {
  const cache = new Map<FinishName, THREE.MeshStandardMaterial>();
  return (name) => {
    const cached = cache.get(name) ?? material(FINISHES[name]);
    cache.set(name, cached);
    return cached;
  };
}

/** A book's geometry: thickness × height × depth, centred on its middle. */
function bookGeometry(thickness: number, height: number, depth: number): THREE.BufferGeometry {
  return new RoundedBoxGeometry(thickness, height, depth, 2, BOOK_RADIUS);
}

/** Height of the recessed plinth under the bottom shelf, in m. */
const PLINTH_HEIGHT = 0.07;
/** How far the plinth's kick board sits back from the front, in m: a shadow line at the floor. */
const PLINTH_RECESS = 0.03;
/** Thickness of the bookcase's back panel, in m: thin hardboard or veneered ply. */
const BACK_PANEL_THICKNESS = 0.006;
/** Target distance from one shelf to the next, in m: room for most books. */
const SHELF_PITCH = 0.37;
/** Space between decor and a bookcase's side, in m. */
const DECOR_MARGIN = 0.05;

/** One compartment between two shelves, in the bookcase's coordinates. */
interface Bay {
  /** Inner faces of the sides, in m. */
  readonly left: number;
  readonly right: number;
  /** Top of the shelf the bay stands on, and the clear height above it, in m. */
  readonly floorY: number;
  readonly clear: number;
  /** Front edge of the shelf, and its depth in front of the back panel, in m. */
  readonly frontZ: number;
  readonly depth: number;
}

/** A decorative group built from x = 0 to x = width, standing on y = 0. */
interface Decor {
  readonly object: THREE.Object3D;
  readonly width: number;
}

/** A book's size on a shelf, clamped so it clears the shelf above and the back panel. */
function shelfBook(bay: Bay, [, height]: Book): [height: number, depth: number] {
  const h = Math.min(height, bay.clear - BOOK_HEADROOM);
  return [h, Math.min(h * BOOK_DEPTH_SHARE, bay.depth - BOOK_SETBACK)];
}

/** A row of upright books, spines to the front; with `lean`, the last one leans on the others. */
function bookRow(bay: Bay, books: readonly Book[], paint: Paint, lean = false): Decor {
  const group = new THREE.Group();
  const upright = lean ? books.slice(0, -1) : books;
  let x = 0;
  let lastHeight = 0;
  for (const book of upright) {
    const [height, depth] = shelfBook(bay, book);
    const mesh = solid(bookGeometry(book[0], height, depth), paint(book[2]));
    mesh.position.set(x + book[0] / 2, height / 2, bay.frontZ - BOOK_SETBACK - depth / 2);
    group.add(mesh);
    x += book[0];
    lastHeight = height;
  }
  const leaning = lean ? books.at(-1) : undefined;
  if (!leaning) return { object: group, width: x };
  // It stands on its bottom-left edge and its cover rests on the last book's top corner.
  const [height, depth] = shelfBook(bay, leaning);
  const footX = x + lastHeight * Math.tan(BOOK_LEAN);
  const pivot = new THREE.Group();
  pivot.position.set(footX, 0, bay.frontZ - BOOK_SETBACK - depth / 2);
  pivot.rotation.z = BOOK_LEAN;
  const mesh = solid(bookGeometry(leaning[0], height, depth), paint(leaning[2]));
  mesh.position.set(leaning[0] / 2, height / 2, 0);
  pivot.add(mesh);
  group.add(pivot);
  return { object: group, width: footX + leaning[0] * Math.cos(BOOK_LEAN) };
}

/** Mirrors a decor group left to right, so a row can lean the other way. */
function mirrored({ object, width }: Decor): Decor {
  object.traverse((part) => {
    if (part === object) return;
    part.position.x = -part.position.x;
    part.rotation.z = -part.rotation.z;
  });
  for (const child of object.children) child.position.x += width;
  return { object, width };
}

/** Books lying in a stack, each turned a touch, largest at the bottom. */
function bookStack(bay: Bay, books: readonly Book[], paint: Paint): Decor {
  const group = new THREE.Group();
  const widest = Math.max(...books.map(([, length]) => length));
  let y = 0;
  books.forEach(([thickness, length, finish], i) => {
    const depth = Math.min(length * BOOK_DEPTH_SHARE, bay.depth - BOOK_SETBACK);
    const mesh = solid(bookGeometry(length, thickness, depth), paint(finish));
    mesh.position.set(widest / 2, y + thickness / 2, bay.frontZ - BOOK_SETBACK - depth / 2);
    mesh.rotation.y = STACK_TWISTS[i % STACK_TWISTS.length]!;
    group.add(mesh);
    y += thickness;
  });
  return { object: group, width: widest };
}

/** A vessel centred in a bay's depth, as decor of its diameter's width. */
function vessel(bay: Bay, mesh: THREE.Mesh, radius: number): Decor {
  mesh.position.set(radius, 0, bay.frontZ - bay.depth / 2);
  return { object: mesh, width: 2 * radius };
}

/** Vase on a shelf: radius and height, in m. */
const SHELF_VASE = { radius: 0.065, height: 0.24 } as const;
/** Bowl on a shelf or a stack: radius and height, in m. */
const SHELF_BOWL = { radius: 0.085, height: 0.06 } as const;

const TALL_ROW: readonly Book[] = [
  [0.028, 0.27, 'linen'],
  [0.036, 0.3, 'white'],
  [0.022, 0.28, 'terracotta'],
  [0.032, 0.29, 'slate'],
  [0.024, 0.28, 'linen'],
  [0.04, 0.3, 'walnut'],
  [0.022, 0.27, 'white'],
  [0.03, 0.29, 'slate'],
  [0.026, 0.26, 'terracotta'],
  [0.034, 0.28, 'linen'],
  [0.028, 0.27, 'slate'],
];
const SHORT_ROW: readonly Book[] = [
  [0.026, 0.23, 'terracotta'],
  [0.02, 0.22, 'linen'],
  [0.034, 0.24, 'white'],
  [0.024, 0.21, 'slate'],
  [0.03, 0.23, 'linen'],
];
const STACK: readonly Book[] = [
  [0.035, 0.3, 'linen'],
  [0.026, 0.27, 'slate'],
  [0.03, 0.24, 'white'],
];
const SMALL_STACK: readonly Book[] = [
  [0.028, 0.25, 'walnut'],
  [0.022, 0.22, 'linen'],
];

/** What one bay holds: something at its left side, its right side, or a share of its width in. */
interface BayLayout {
  readonly left?: Decor;
  readonly right?: Decor;
  /** Placed with its left edge at this share of the bay's width. */
  readonly inside?: readonly [share: number, decor: Decor];
}

/** A ceramic vase on a shelf, no taller than the bay allows. */
function shelfVase(bay: Bay, paint: Paint): Decor {
  const height = Math.min(SHELF_VASE.height, bay.clear - BOOK_HEADROOM);
  const mesh = turned(VASE_PROFILE, SHELF_VASE.radius, height, paint('concrete'));
  return vessel(bay, mesh, SHELF_VASE.radius);
}

/** A turned wooden bowl on a shelf. */
function shelfBowl(bay: Bay, paint: Paint): Decor {
  const mesh = turned(BOWL_PROFILE, SHELF_BOWL.radius, SHELF_BOWL.height, paint('walnut'));
  return vessel(bay, mesh, SHELF_BOWL.radius);
}

/** Bay contents, bottom bay first, repeating upwards. Calm: some bays hold a single thing. */
const BAY_LAYOUTS: readonly ((bay: Bay, paint: Paint) => BayLayout)[] = [
  (bay, paint) => ({ left: bookRow(bay, TALL_ROW, paint, true) }),
  (bay, paint) => ({ inside: [0.2, shelfVase(bay, paint)], right: bookStack(bay, STACK, paint) }),
  (bay, paint) => ({ right: mirrored(bookRow(bay, SHORT_ROW, paint, true)) }),
  (bay, paint) => ({ inside: [0.38, shelfBowl(bay, paint)] }),
  (bay, paint) => ({ left: bookStack(bay, SMALL_STACK, paint) }),
];

/** Places a bay's decor; what doesn't fit a narrow bay is left out rather than squeezed. */
function furnishBay(bay: Bay, layout: BayLayout): THREE.Object3D[] {
  const placed: [x: number, decor: Decor][] = [];
  const room = bay.right - bay.left;
  if (layout.left) placed.push([bay.left + DECOR_MARGIN, layout.left]);
  if (layout.inside) placed.push([bay.left + layout.inside[0] * room, layout.inside[1]]);
  if (layout.right) placed.push([bay.right - DECOR_MARGIN - layout.right.width, layout.right]);
  const fitting: THREE.Object3D[] = [];
  let freeFrom = bay.left + DECOR_MARGIN;
  for (const [x, { object, width }] of placed.sort((a, b) => a[0] - b[0])) {
    if (x < freeFrom || x + width > bay.right - DECOR_MARGIN) continue;
    object.position.x += x;
    object.position.y += bay.floorY;
    fitting.push(object);
    freeFrom = x + width + DECOR_MARGIN;
  }
  return fitting;
}

/** The bookcase's carcass: full-height sides, a top, a recessed kick board and a thin back. */
function bookcaseCarcass(
  { width, depth, height }: { width: number; depth: number; height: number },
  wood: THREE.Material,
  back: THREE.Material,
): THREE.Object3D[] {
  const t = PANEL_THICKNESS;
  const innerWidth = width - 2 * t;
  const backHeight = height - t - PLINTH_HEIGHT;
  return [
    ...[-1, 1].map((side) =>
      panel(t, height - t, depth, wood, [side * (width / 2 - t / 2), (height - t) / 2, 0]),
    ),
    panel(width, t, depth, wood, [0, height - t / 2, 0]),
    panel(innerWidth, PLINTH_HEIGHT, t, wood, [
      0,
      PLINTH_HEIGHT / 2,
      depth / 2 - PLINTH_RECESS - t / 2,
    ]),
    panel(innerWidth, backHeight, BACK_PANEL_THICKNESS, back, [
      0,
      PLINTH_HEIGHT + backHeight / 2,
      -depth / 2 + BACK_PANEL_THICKNESS / 2,
    ]),
  ];
}

/**
 * An open bookcase: full-height sides on a recessed plinth, evenly spaced
 * shelves (one per ~0.37 m of height) and a thin back panel in `accent`.
 * A few books, a vase and a bowl make it read as lived in.
 */
export const bookcase: PieceBuilder = (size, { main, accent }) => {
  const { width, depth, height } = size;
  const wood = material(main);
  const paint = paintCache();
  const group = new THREE.Group();
  group.add(...bookcaseCarcass(size, wood, material(accent)));

  const t = PANEL_THICKNESS;
  const innerWidth = width - 2 * t;
  // From the bottom shelf's top to the top panel's underside.
  const interior = height - PLINTH_HEIGHT - 2 * t;
  const bays = Math.max(1, Math.round(interior / SHELF_PITCH));
  const clear = (interior - (bays - 1) * t) / bays;
  const shelfDepth = depth - BACK_PANEL_THICKNESS;
  for (let i = 0; i < bays; i++) {
    const shelfY = PLINTH_HEIGHT + i * (clear + t);
    group.add(
      panel(innerWidth, t, shelfDepth, wood, [0, shelfY + t / 2, BACK_PANEL_THICKNESS / 2]),
    );
    const bay: Bay = {
      left: -innerWidth / 2,
      right: innerWidth / 2,
      floorY: shelfY + t,
      clear,
      frontZ: depth / 2,
      depth: shelfDepth,
    };
    group.add(...furnishBay(bay, BAY_LAYOUTS[i % BAY_LAYOUTS.length]!(bay, paint)));
  }
  return group;
};

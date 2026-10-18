import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  FURNITURE_KINDS,
  FURNITURE_TYPES,
  Simulator,
  serializeScene,
  type FurnitureKind,
  type Vec3,
} from '@luxstudio/core';
import { pack } from '../../demo/src/link-storage';
import { sampleCatalog } from '../../demo/src/sample-catalog';
import { SAMPLE_IES_FILES } from '../../demo/src/sample-photometry';

// Pictures of the accuracy reference rooms (ADR 0062), for the Analysis
// pages: each room rebuilt in the demo from its products and furniture, opened
// through a share link, and the 3D view captured. Language-free, so taken once.

/** A reference room's file, accuracy/rooms/<name>.json: the parts a picture needs. */
interface ReferenceRoom {
  readonly room: { readonly width: number; readonly depth: number; readonly height: number };
  readonly surfaces?: Partial<Record<'floor' | 'walls' | 'ceiling', number>>;
  readonly luminaires: readonly {
    readonly ies: string;
    readonly origin: Vec3;
    readonly tiltDeg?: number;
    readonly panDeg?: number;
  }[];
  readonly blockers?: readonly {
    readonly centre: Vec3;
    readonly half: Vec3;
    readonly yawDeg?: number;
  }[];
}

const ROOMS_DIR = new URL('../../../accuracy/rooms/', import.meta.url);
const productOf = (ies: string) => {
  const id = Object.keys(SAMPLE_IES_FILES).find((key) => SAMPLE_IES_FILES[key] === ies);
  if (!id) throw new Error(`No demo product has ${ies}`);
  return id;
};

/**
 * The furniture kind a reference box was made from, and its turn: the rooms
 * use the demo's pieces at their usual sizes, so a box is the kind whose usual
 * size it has, along its axes or across them (turned a quarter). A table's box
 * is only its top, so its height is the top's.
 */
function kindOf({ centre, half, yawDeg = 0 }: { centre: Vec3; half: Vec3; yawDeg?: number }): {
  kind: FurnitureKind;
  rotationDeg: number;
} {
  const [width, depth, top] = [2 * half.x, 2 * half.z, centre.y + half.y];
  const near = (a: number, b: number) => Math.abs(a - b) < 0.01;
  for (const kind of FURNITURE_KINDS) {
    const size = FURNITURE_TYPES[kind].size;
    if (!near(size.height, top)) continue;
    if (near(size.width, width) && near(size.depth, depth)) return { kind, rotationDeg: yawDeg };
    if (near(size.width, depth) && near(size.depth, width))
      return { kind, rotationDeg: yawDeg + 90 };
  }
  throw new Error(`No furniture kind is ${width} × ${depth} × ${top} m`);
}

/** An sRGB grey whose linear brightness is `reflectance`. */
function grey(reflectance: number): string {
  const level = Math.round(255 * reflectance ** (1 / 2.2));
  return `#${level.toString(16).padStart(2, '0').repeat(3)}`;
}

/** The reference room as a demo scene: same size, surfaces, luminaires, aims and furniture. */
function sceneOf(room: ReferenceRoom): string {
  const sim = new Simulator({ catalog: sampleCatalog });
  sim.setRoomSize(room.room);
  // A room that sets its reflectances is drawn in greys that match them.
  for (const [name, reflectance] of Object.entries(room.surfaces ?? {})) {
    sim.setSurface(name as 'floor' | 'walls' | 'ceiling', {
      color: grey(reflectance),
      reflectance,
    });
  }
  for (const luminaire of room.luminaires) {
    sim.addLuminaire(productOf(luminaire.ies), {
      // The light's origin, which is within centimetres of the fixture's
      // position for these products; each mount keeps it where it belongs.
      position: luminaire.origin,
      aim: { tiltDeg: luminaire.tiltDeg ?? 0, panDeg: luminaire.panDeg ?? 0 },
    });
  }
  for (const box of room.blockers ?? []) {
    const { kind, rotationDeg } = kindOf(box);
    sim.addFurniture(kind, { at: { x: box.centre.x, z: box.centre.z }, rotationDeg });
  }
  return serializeScene(sim.scene);
}

for (const file of readdirSync(ROOMS_DIR).filter((name: string) => name.endsWith('.json'))) {
  const name = file.replace(/\.json$/, '');
  test(`analysis room: ${name}`, async ({ page }) => {
    const room = JSON.parse(readFileSync(new URL(file, ROOMS_DIR), 'utf8')) as ReferenceRoom;
    await page.addInitScript(() => localStorage.setItem('lxs-help-seen', '1'));
    await page.goto(`/#scene=${await pack(sceneOf(room))}`);
    const viewport = page.locator('lxs-viewport');
    await expect(viewport.locator('canvas')).toBeVisible();
    await expect(page.locator('#splash')).toHaveCount(0);
    // Let IES files and models arrive and shadows settle.
    await page.waitForTimeout(1500);
    // The demo's own screenshot: the 3D view alone, without the controls over it.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Captura' }).click(),
    ]);
    await download.saveAs(`pages/public/analysis/${name}.png`);
  });
}

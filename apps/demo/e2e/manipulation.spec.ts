import { expect, ready, test, type Page } from './fixtures';

// Moving luminaires by dragging them (ADR 0038) and with the move handle
// (ADR 0039). Screen points are for the default view at 1280×800, as in
// smoke.spec.ts.
const PENDANT = { x: 642, y: 356 };
const WALL_LIGHT = { x: 845, y: 437 };
/** With the pendant selected: the right arm of its x (red) arrow, and the upper arm of its height (green) arrow. */
const PENDANT_X_ARROW = { x: 675, y: 362 };
const PENDANT_HEIGHT_ARROW = { x: 642, y: 312 };
/** The track spot on the ceiling, aimed at the picture on the left wall; in aim mode, its beam marker and the right of its ring. */
const TRACK_SPOT = { x: 523, y: 312 };
const SPOT_AIM_POINT = { x: 432, y: 375 };
const SPOT_RING_RIGHT = { x: 569, y: 306 };

async function openDemo(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await ready(page);
  return errors;
}

/** Presses at `from`, moves to `to` in small steps and releases. */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

/** The inspector's number field with this label, as a number (es-AR uses a decimal comma). */
async function positionField(
  page: Page,
  label: 'X' | 'Altura' | 'Z' | 'Inclinación' | 'Giro',
): Promise<number> {
  const value = await page.getByRole('textbox', { name: label, exact: false }).inputValue();
  return Number(value.replace(',', '.'));
}

const selectedCount = (page: Page) => page.getByText(/^Seleccionadas: \d+$/);

test(
  'dragging a luminaire moves it in one undo step and leaves the camera alone',
  { tag: '@all-browsers' },
  async ({ page }) => {
    const errors = await openDemo(page);
    await page.mouse.click(PENDANT.x, PENDANT.y);
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('pendant-selected.png');

    await drag(page, PENDANT, { x: PENDANT.x + 160, y: PENDANT.y });
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
    // Moved across the room at the same height.
    expect(await positionField(page, 'X')).toBeGreaterThan(0.5);
    expect(await positionField(page, 'Altura')).toBeCloseTo(2.1, 2);
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('pendant-dragged.png');

    // One undo puts it back, and the camera never moved: the same image as before the drag.
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => positionField(page, 'X')).toBe(0);
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('pendant-selected.png');
    expect(errors).toEqual([]);
  },
);

test('dragging empty space still orbits the camera', { tag: '@all-browsers' }, async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('lxs-viewport')).toHaveScreenshot('before-orbit.png');
  await drag(page, { x: 380, y: 600 }, { x: 520, y: 600 });
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 0');
  await expect(page).not.toHaveScreenshot('before-orbit.png');
});

test('the rest of the selection moves along', { tag: '@all-browsers' }, async ({ page }) => {
  await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await page.keyboard.down('Shift');
  await page.mouse.click(WALL_LIGHT.x, WALL_LIGHT.y);
  await page.keyboard.up('Shift');
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 2');

  // Towards the camera: +z.
  await drag(page, PENDANT, { x: PENDANT.x, y: PENDANT.y + 120 });
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 2');
  await page.getByRole('tab', { name: 'Escena' }).click();
  await page.getByRole('option', { name: /Aplique arriba\/abajo 18 W \(IES\) 1/ }).click();
  // The wall light slid along its wall (x = 2.5) by the same z offset.
  expect(await positionField(page, 'X')).toBe(2.5);
  expect(await positionField(page, 'Z')).toBeGreaterThan(0.3);
});

test(
  'dragging an unselected wall light selects it and slides it along its wall',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await openDemo(page);
    await page.mouse.click(PENDANT.x, PENDANT.y);
    // Up and towards the front along the right wall (x = 2.5), which the camera has cut away.
    await drag(page, WALL_LIGHT, { x: WALL_LIGHT.x - 40, y: WALL_LIGHT.y - 30 });
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
    await expect(
      page.getByText('Aplique arriba/abajo 18 W (IES) 1', { exact: true }),
    ).toBeVisible();
    expect(await positionField(page, 'X')).toBe(2.5);
    expect(await positionField(page, 'Altura')).toBeGreaterThan(1.9);
    expect(await positionField(page, 'Z')).toBeGreaterThan(0.1);
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('wall-light-dragged.png');
  },
);

test(
  'the move handle slides the selection along one axis at a time',
  { tag: '@all-browsers' },
  async ({ page }) => {
    const errors = await openDemo(page);
    await page.mouse.click(PENDANT.x, PENDANT.y);
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('move-handle.png');

    // Pointer motion off the axis is ignored: only x changes.
    await drag(page, PENDANT_X_ARROW, { x: PENDANT_X_ARROW.x + 90, y: PENDANT_X_ARROW.y + 40 });
    expect(await positionField(page, 'X')).toBeGreaterThan(0.5);
    expect(await positionField(page, 'Altura')).toBe(2.1);
    expect(await positionField(page, 'Z')).toBe(0);
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => positionField(page, 'X')).toBe(0);

    // Pendants also get height.
    await drag(page, PENDANT_HEIGHT_ARROW, { x: PENDANT_HEIGHT_ARROW.x + 30, y: 360 });
    expect(await positionField(page, 'Altura')).toBeLessThan(1.8);
    expect(await positionField(page, 'X')).toBe(0);
    expect(await positionField(page, 'Z')).toBe(0);
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
    expect(errors).toEqual([]);
  },
);

test('clicking the handle keeps the selection', { tag: '@all-browsers' }, async ({ page }) => {
  await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await page.mouse.click(PENDANT_X_ARROW.x, PENDANT_X_ARROW.y);
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  expect(await positionField(page, 'X')).toBe(0);
});

test(
  'E switches to the aim handle: drag the beam’s landing point to re-aim',
  { tag: '@all-browsers' },
  async ({ page }) => {
    const errors = await openDemo(page);
    await page.mouse.click(TRACK_SPOT.x, TRACK_SPOT.y);
    await page.keyboard.press('e');
    await expect(page.getByRole('radio', { name: 'Orientar' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('aim-handle.png');

    // From the left wall to the floor in front: less tilt, turned towards the front right.
    await drag(page, SPOT_AIM_POINT, { x: 600, y: 600 });
    expect(await positionField(page, 'Inclinación')).toBeLessThan(50);
    expect(await positionField(page, 'Giro')).toBeGreaterThan(0);
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('spot-re-aimed.png');

    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => positionField(page, 'Giro')).toBe(-90);
    expect(await positionField(page, 'Inclinación')).toBe(50);
    expect(errors).toEqual([]);
  },
);

test(
  'the rotation ring turns pan only, in 15° steps',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await openDemo(page);
    await page.mouse.click(TRACK_SPOT.x, TRACK_SPOT.y);
    await page.getByRole('radio', { name: 'Orientar' }).click();
    // A quarter turn, from the right of the ring to its front.
    await drag(page, SPOT_RING_RIGHT, { x: TRACK_SPOT.x, y: 330 });
    const pan = await positionField(page, 'Giro');
    expect(pan).not.toBe(-90);
    expect(Math.abs(pan % 15)).toBe(0); // abs: −180 % 15 is −0.
    expect(await positionField(page, 'Inclinación')).toBe(50);
    // Position untouched, selection kept.
    expect(await positionField(page, 'X')).toBe(-1);
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  },
);

test('W and the toolbar switch back to moving', { tag: '@all-browsers' }, async ({ page }) => {
  await openDemo(page);
  const move = page.getByRole('radio', { name: 'Mover' });
  const aim = page.getByRole('radio', { name: 'Orientar' });
  await expect(move).toHaveAttribute('aria-checked', 'true');
  await aim.click();
  await expect(aim).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('w');
  await expect(move).toHaveAttribute('aria-checked', 'true');
  await aim.click();
  await move.click();
  await expect(move).toHaveAttribute('aria-checked', 'true');
});

/** Whether a field value sits on the 10 cm grid. */
const onGrid = (value: number) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-6;

test(
  'drags snap to the 10 cm grid; Alt or the magnet move freely',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await openDemo(page);
    const across = { x: PENDANT.x + 160, y: PENDANT.y };
    await drag(page, PENDANT, across);
    expect(onGrid(await positionField(page, 'X'))).toBe(true);
    expect(onGrid(await positionField(page, 'Z'))).toBe(true);

    // The same drag with Alt held lands off the grid.
    await page.keyboard.press('ControlOrMeta+z');
    await page.keyboard.down('Alt');
    await drag(page, PENDANT, across);
    await page.keyboard.up('Alt');
    expect(onGrid(await positionField(page, 'Z'))).toBe(false);

    // So does it with the magnet off.
    await page.keyboard.press('ControlOrMeta+z');
    const magnet = page.getByRole('button', { name: 'Ajuste magnético' });
    await expect(magnet).toHaveAttribute('aria-pressed', 'true');
    await magnet.click();
    await expect(magnet).toHaveAttribute('aria-pressed', 'false');
    await drag(page, PENDANT, across);
    expect(onGrid(await positionField(page, 'Z'))).toBe(false);
  },
);

test(
  'a dragged luminaire lines up with another, shown by a guide',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await openDemo(page);
    // A little left: the spot lines up with the wall washer behind it at x = −1.2.
    await page.mouse.move(TRACK_SPOT.x, TRACK_SPOT.y);
    await page.mouse.down();
    await page.mouse.move(TRACK_SPOT.x - 16, TRACK_SPOT.y, { steps: 6 });
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('alignment-guide.png');
    await page.mouse.up();
    expect(await positionField(page, 'X')).toBe(-1.2);
  },
);

const byValue = (a: number, b: number) => a - b;

/** The distance labels shown while moving, as numbers, sorted. */
async function distanceLabels(page: Page): Promise<number[]> {
  const texts = await page.locator('lxs-viewport .measure').allInnerTexts();
  return texts.map((text) => Number(text.replace(' m', '').replace(',', '.'))).sort(byValue);
}

test(
  'moving shows distances to the walls, gone on release',
  { tag: '@all-browsers' },
  async ({ page }) => {
    const errors = await openDemo(page);
    await page.mouse.move(PENDANT.x, PENDANT.y);
    await page.mouse.down();
    await page.mouse.move(PENDANT.x + 160, PENDANT.y, { steps: 10 });
    await expect(page.locator('lxs-viewport .measure')).toHaveCount(2);
    const during = await distanceLabels(page);
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('distances.png');
    await page.mouse.up();
    await expect(page.locator('lxs-viewport .measure')).toHaveCount(0);

    // To the right wall (x = 2.5) and the back wall (z = −2).
    const x = await positionField(page, 'X');
    const z = await positionField(page, 'Z');
    expect(during).toEqual([2.5 - x, z + 2].map((d) => Math.round(d * 100) / 100).sort(byValue));
    expect(errors).toEqual([]);
  },
);

test(
  'a wall light shows its distance along the wall and its height',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await openDemo(page);
    await page.mouse.move(WALL_LIGHT.x, WALL_LIGHT.y);
    await page.mouse.down();
    await page.mouse.move(WALL_LIGHT.x - 40, WALL_LIGHT.y - 30, { steps: 10 });
    await expect(page.locator('lxs-viewport .measure')).toHaveCount(2);
    const during = await distanceLabels(page);
    await page.mouse.up();

    // On the right wall: to the front corner (z = 2), and down to the floor.
    const height = await positionField(page, 'Altura');
    const z = await positionField(page, 'Z');
    expect(during).toEqual([2 - z, height].map((d) => Math.round(d * 100) / 100).sort(byValue));
  },
);

test(
  'a drag with more dimensions than the last one draws them all',
  { tag: '@all-browsers' },
  async ({ page }) => {
    // Regression: dimension lines reused a buffer too small for a third line.
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });
    await openDemo(page);
    await page.mouse.click(PENDANT.x, PENDANT.y);
    await drag(page, PENDANT, { x: PENDANT.x + 40, y: PENDANT.y }); // Two dimensions.
    await page.keyboard.press('ControlOrMeta+z');
    await page.mouse.move(PENDANT_HEIGHT_ARROW.x, PENDANT_HEIGHT_ARROW.y);
    await page.mouse.down();
    await page.mouse.move(PENDANT_HEIGHT_ARROW.x, PENDANT_HEIGHT_ARROW.y + 30, { steps: 6 });
    await expect(page.locator('lxs-viewport .measure')).toHaveCount(3); // Plus height.
    await page.mouse.up();
    expect(warnings.filter((text) => /BufferGeometry/.test(text))).toEqual([]);
  },
);

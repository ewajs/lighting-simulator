import { expect, test, type Page } from './fixtures';

// Moving luminaires by dragging them (ADR 0038) and with the move handle
// (ADR 0039). Screen points are for the default view at 1280×800, as in
// smoke.spec.ts.
const PENDANT = { x: 642, y: 356 };
const WALL_LIGHT = { x: 845, y: 437 };
/** With the pendant selected: the right arm of its x (red) arrow, and the upper arm of its height (green) arrow. */
const PENDANT_X_ARROW = { x: 675, y: 362 };
const PENDANT_HEIGHT_ARROW = { x: 642, y: 312 };

async function openDemo(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await expect(page.locator('lxs-viewport canvas')).toBeVisible();
  return errors;
}

/** Presses at `from`, moves to `to` in small steps and releases. */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

/** The inspector's position field with this label, as a number (es-AR uses a decimal comma). */
async function positionField(page: Page, label: 'X' | 'Altura' | 'Z'): Promise<number> {
  const value = await page.getByRole('textbox', { name: label, exact: false }).inputValue();
  return Number(value.replace(',', '.'));
}

const selectedCount = (page: Page) => page.getByText(/^Seleccionadas: \d+$/);

test('dragging a luminaire moves it in one undo step and leaves the camera alone', async ({
  page,
}) => {
  const errors = await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await expect(page).toHaveScreenshot('pendant-selected.png');

  await drag(page, PENDANT, { x: PENDANT.x + 160, y: PENDANT.y });
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  // Moved across the room at the same height.
  expect(await positionField(page, 'X')).toBeGreaterThan(0.5);
  expect(await positionField(page, 'Altura')).toBeCloseTo(2.1, 2);
  await expect(page).toHaveScreenshot('pendant-dragged.png');

  // One undo puts it back, and the camera never moved: the same image as before the drag.
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => positionField(page, 'X')).toBe(0);
  await expect(page).toHaveScreenshot('pendant-selected.png');
  expect(errors).toEqual([]);
});

test('dragging empty space still orbits the camera', async ({ page }) => {
  await openDemo(page);
  await expect(page).toHaveScreenshot('before-orbit.png');
  await drag(page, { x: 380, y: 600 }, { x: 520, y: 600 });
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 0');
  await expect(page).not.toHaveScreenshot('before-orbit.png');
});

test('the rest of the selection moves along', async ({ page }) => {
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

test('dragging an unselected wall light selects it and slides it along its wall', async ({
  page,
}) => {
  await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  // Up and towards the front along the right wall (x = 2.5), which the camera has cut away.
  await drag(page, WALL_LIGHT, { x: WALL_LIGHT.x - 40, y: WALL_LIGHT.y - 30 });
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  await expect(page.getByText('Aplique arriba/abajo 18 W (IES) 1', { exact: true })).toBeVisible();
  expect(await positionField(page, 'X')).toBe(2.5);
  expect(await positionField(page, 'Altura')).toBeGreaterThan(1.9);
  expect(await positionField(page, 'Z')).toBeGreaterThan(0.1);
  await expect(page).toHaveScreenshot('wall-light-dragged.png');
});

test('the move handle slides the selection along one axis at a time', async ({ page }) => {
  const errors = await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await expect(page).toHaveScreenshot('move-handle.png');

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
});

test('clicking the handle keeps the selection', async ({ page }) => {
  await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await page.mouse.click(PENDANT_X_ARROW.x, PENDANT_X_ARROW.y);
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  expect(await positionField(page, 'X')).toBe(0);
});

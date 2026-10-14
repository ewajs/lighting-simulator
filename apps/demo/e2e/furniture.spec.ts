import { expect, test, type Page } from './fixtures';

// Furniture (ADR 0047): adding it, selecting it, editing it in the inspector
// and dragging it over the floor. Screen points are for the default view at
// 1280×800, as in smoke.spec.ts.
const TABLE = { x: 640, y: 455 };
const PENDANT = { x: 642, y: 356 };
/** On the table's +x arrow, which sits at the table's middle height. */
const TABLE_X_ARROW = { x: 686, y: 497 };
/** The front (+z) and right (+x) of the table's rotation ring, on the floor: a quarter turn apart. */
const RING_FRONT = { x: 647, y: 560 };
const RING_RIGHT = { x: 729, y: 510 };

async function openDemo(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('lxs-viewport canvas')).toBeVisible();
}

/** Presses at `from`, moves to `to` in small steps and releases. */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

/** The inspector's number field with this label, as a number (es-AR uses a decimal comma). */
async function field(page: Page, label: 'X' | 'Z' | 'Rotación'): Promise<number> {
  const value = await page.getByRole('textbox', { name: label, exact: false }).inputValue();
  return Number(value.replace(',', '.'));
}

const selectedCount = (page: Page) => page.getByText(/^Seleccionadas: \d+$/);
const inspectorHeading = (page: Page) => page.locator('lxs-inspector h2');

test('clicking a piece selects it; the inspector resizes and refinishes it, one undo step each', async ({
  page,
}) => {
  await openDemo(page);
  await page.mouse.click(TABLE.x, TABLE.y);
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  await expect(inspectorHeading(page)).toHaveText('Mobiliario');
  await expect(page.getByText('Mesa de comedor 1', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('table-selected.png');

  await page.getByRole('radio', { name: 'Nogal' }).click();
  await expect(page.getByRole('radio', { name: 'Nogal' })).toHaveAttribute('aria-checked', 'true');
  const width = page.getByRole('textbox', { name: 'Ancho' });
  await width.fill('2');
  await width.press('Enter');
  await expect(width).toHaveValue('2,00');
  await expect(page).toHaveScreenshot('table-walnut-wider.png');

  // Width first, then the finish.
  await page.keyboard.press('ControlOrMeta+z');
  await expect(width).toHaveValue('1,60');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.getByRole('radio', { name: 'Roble' })).toHaveAttribute('aria-checked', 'true');
});

test('dragging a piece moves it over the floor in one undo step', async ({ page }) => {
  await openDemo(page);
  // Towards the camera: +z.
  await drag(page, TABLE, { x: TABLE.x, y: TABLE.y + 80 });
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  await expect(page.getByText('Mesa de comedor 1', { exact: true })).toBeVisible();
  expect(await field(page, 'Z')).toBeGreaterThan(0.3);
  await expect(page).toHaveScreenshot('table-dragged.png');

  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => field(page, 'Z')).toBe(0);
});

test('furniture is added from the catalog by click and by drag and drop', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('radio', { name: 'Mobiliario' }).click();
  await expect(page.getByText('14 muebles')).toBeVisible();
  await expect(page.locator('lxs-catalog-panel')).toHaveScreenshot('furniture-catalog.png');

  const list = page.locator('lxs-furniture-list');
  await list.getByRole('button', { name: /Sofá/ }).click();
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  await expect(page.getByText('Sofá 1', { exact: true })).toBeVisible();
  // The table and chairs fill the centre: the sofa goes to the nearest free spot.
  expect(Math.abs(await field(page, 'Z'))).toBeGreaterThan(1);

  // Onto the floor in front of the table, a little left: not the room centre.
  await list
    .getByRole('button', { name: /Planta/ })
    .dragTo(page.locator('lxs-viewport'), { targetPosition: { x: 300, y: 470 } });
  await expect(page.getByText('Planta 2', { exact: true })).toBeVisible();
  expect(await field(page, 'X')).toBeLessThan(0);
  expect(await field(page, 'Z')).toBeGreaterThan(0);

  await page.getByRole('tab', { name: 'Escena' }).click();
  const furniture = page.getByRole('listbox', { name: 'Mobiliario' });
  await expect(furniture.getByRole('option')).toHaveCount(9);
  await expect(furniture.getByRole('option', { name: /Planta 2/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('duplicate and delete act on the selected furniture; selections never mix kinds', async ({
  page,
}) => {
  await openDemo(page);
  await page.mouse.click(TABLE.x, TABLE.y);
  await page.keyboard.press('ControlOrMeta+d');
  await expect(page.getByText('Mesa de comedor 2', { exact: true })).toBeVisible();
  await page.keyboard.press('Delete');
  await expect(inspectorHeading(page)).toHaveText('Ambiente');
  await expect(page.getByText('Luminarias: 5')).toBeVisible();

  // Shift-clicking a luminaire while furniture is selected starts over with it.
  await page.mouse.click(TABLE.x, TABLE.y);
  await page.keyboard.down('Shift');
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await page.keyboard.up('Shift');
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  await expect(inspectorHeading(page)).toHaveText('Luminaria');
});

test('the move arrows slide a piece along one axis, and the floor ring turns it', async ({
  page,
}) => {
  await openDemo(page);
  await page.mouse.click(TABLE.x, TABLE.y);
  await drag(page, TABLE_X_ARROW, { x: TABLE_X_ARROW.x + 60, y: TABLE_X_ARROW.y + 23 });
  expect(await field(page, 'X')).toBeGreaterThan(0.3);
  expect(await field(page, 'Z')).toBe(0);
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => field(page, 'X')).toBe(0);

  // A quarter turn around the ring, snapped to 15° steps.
  await drag(page, RING_FRONT, RING_RIGHT);
  expect(await field(page, 'Rotación')).toBe(90);
  expect(await field(page, 'X')).toBe(0);
  await expect(page).toHaveScreenshot('table-turned.png');
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => field(page, 'Rotación')).toBe(0);
});

test('select all picks every piece when furniture is selected', async ({ page }) => {
  await openDemo(page);
  await page.mouse.click(TABLE.x, TABLE.y);
  await page.keyboard.press('ControlOrMeta+a');
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 7');
  await expect(inspectorHeading(page)).toHaveText('Mobiliario');
});

test('moving a piece shows the gaps from its edges to the walls, gone on release', async ({
  page,
}) => {
  await openDemo(page);
  await page.mouse.move(TABLE.x, TABLE.y);
  await page.mouse.down();
  await page.mouse.move(TABLE.x + 40, TABLE.y + 60, { steps: 10 });
  await expect(page.locator('lxs-viewport .measure')).toHaveCount(2);
  const texts = await page.locator('lxs-viewport .measure').allInnerTexts();
  const during = texts.map((text) => Number(text.replace(' m', '').replace(',', '.')));
  await expect(page).toHaveScreenshot('table-distances.png');
  await page.mouse.up();
  await expect(page.locator('lxs-viewport .measure')).toHaveCount(0);

  // The table is 1.6 × 0.9 m: from its right edge to x = 2.5, its front edge to z = 2.
  const x = await field(page, 'X');
  const z = await field(page, 'Z');
  const gaps = [2.5 - (x + 0.8), 2 - (z + 0.45)].map((d) => Math.round(d * 100) / 100);
  expect(during.sort()).toEqual(gaps.sort());
});

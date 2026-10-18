import { expect, ready, test, type Page } from './fixtures';

// Windows (ADR 0078): adding them from the catalog, editing them in the
// inspector, picking and sliding them along their wall, and the Scene list.
// Screen points are for the default view at 1280×800, as in smoke.spec.ts.
/** On the glass of the window the catalog adds to the back wall, clear of its move arrows. */
const BACK_WINDOW_GLASS = { x: 705, y: 315 };

async function openDemo(page: Page): Promise<void> {
  await page.goto('/');
  await ready(page);
}

/** Opens the catalog's windows and clicks the card whose name starts with `name`. */
async function addWindow(page: Page, name: 'Ventana' | 'Ventanal' | 'Tragaluz'): Promise<void> {
  await page.getByRole('radio', { name: 'Ventanas' }).click();
  await page
    .locator('lxs-window-list')
    .getByRole('button', { name: new RegExp(`^${name} `) })
    .click();
}

/** The inspector's number field with this label, as a number (es-AR uses a decimal comma). */
async function field(page: Page, label: 'X' | 'Z' | 'Antepecho'): Promise<number> {
  const value = await page.getByRole('textbox', { name: label, exact: false }).inputValue();
  return Number(value.replace(',', '.'));
}

const selectedCount = (page: Page) => page.getByText(/^Seleccionadas: \d+$/);
const inspectorHeading = (page: Page) => page.locator('lxs-inspector h2');
const subtitle = (page: Page) => page.locator('lxs-window-inspector .sub');
const checked = (page: Page, name: string) =>
  expect(page.getByRole('radio', { name, exact: true })).toHaveAttribute('aria-checked', 'true');

test(
  'a window is added from the catalog and edited in the inspector, one undo step each',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await openDemo(page);
    await addWindow(page, 'Ventana');
    await expect(page.getByText('3 tipos')).toBeVisible();
    await expect(inspectorHeading(page)).toHaveText('Ventana');
    await expect(page.getByText('Ventana 1', { exact: true })).toBeVisible();
    await expect(subtitle(page)).toHaveText('Pared del fondo');
    expect(await field(page, 'Antepecho')).toBe(0.9);
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('window-added.png');

    await page.getByRole('radio', { name: 'Esmerilado' }).click();
    await checked(page, 'Esmerilado');
    await page.getByRole('radio', { name: 'Pared izquierda' }).click();
    await expect(subtitle(page)).toHaveText('Pared izquierda');
    // Onto another wall it keeps its sill, centred along the wall.
    expect(await field(page, 'Antepecho')).toBe(0.9);
    expect(await field(page, 'Z')).toBe(0);

    await page.keyboard.press('ControlOrMeta+z');
    await expect(subtitle(page)).toHaveText('Pared del fondo');
    await page.keyboard.press('ControlOrMeta+z');
    await checked(page, 'Transparente');
  },
);

test(
  'clicking a window selects it; dragging slides it along its wall in one undo step',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await openDemo(page);
    await addWindow(page, 'Ventana');
    await page.keyboard.press('Escape');
    await expect(inspectorHeading(page)).toHaveText('Ambiente');

    await page.mouse.click(BACK_WINDOW_GLASS.x, BACK_WINDOW_GLASS.y);
    await expect(inspectorHeading(page)).toHaveText('Ventana');
    await page.mouse.move(BACK_WINDOW_GLASS.x, BACK_WINDOW_GLASS.y);
    await page.mouse.down();
    await page.mouse.move(BACK_WINDOW_GLASS.x - 120, BACK_WINDOW_GLASS.y + 30, { steps: 10 });
    await page.mouse.up();
    // Along the wall, not off it: x changes, the sill barely.
    expect(await field(page, 'X')).toBeLessThan(-0.5);
    await expect(subtitle(page)).toHaveText('Pared del fondo');
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => field(page, 'X')).toBe(0);
  },
);

test('a window dropped near a wall goes in it; windows are listed in the Scene panel', async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole('radio', { name: 'Ventanas' }).click();
  // Onto the floor by the right wall.
  await page
    .locator('lxs-window-list')
    .getByRole('button', { name: /^Ventanal / })
    .dragTo(page.locator('lxs-viewport'), { targetPosition: { x: 500, y: 540 } });
  await expect(subtitle(page)).toHaveText('Pared derecha');
  await addWindow(page, 'Tragaluz');
  await expect(page.getByText('Tragaluz 1', { exact: true })).toBeVisible();

  // Select all picks every window when a window is selected.
  await page.keyboard.press('ControlOrMeta+a');
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 2');
  await expect(page.getByText('2 ventanas seleccionadas')).toBeVisible();

  await page.getByRole('tab', { name: 'Escena' }).click();
  const windows = page.getByRole('listbox', { name: 'Ventanas' });
  await expect(windows.getByRole('option')).toHaveCount(2);
  await windows.getByRole('option', { name: /Ventana 1/ }).click();
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  await expect(subtitle(page)).toHaveText('Pared derecha');
});

test('the daylight is set in the Room panel, one undo step each', async ({ page }) => {
  await openDemo(page);
  // The demo's rooms are in Buenos Aires; the equinox sun at 16:00 there is 24° up.
  await expect(page.getByRole('textbox', { name: 'Latitud' })).toHaveValue('-34,6');
  await page.getByRole('radio', { name: 'Despejado, con sol' }).click();
  await page.getByRole('radio', { name: 'Tarde' }).click();
  await expect(page.getByText('El sol está a 24° sobre el horizonte.')).toBeVisible();
  await page.getByRole('radio', { name: 'Noche' }).click();
  await expect(page.getByText('Sin luz natural: solo iluminan las luminarias.')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  await checked(page, 'Mediodía');
  await checked(page, 'Despejado, con sol');
});

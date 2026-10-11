import { expect, test, type Page } from '@playwright/test';

// Screen points at the fixed 1280×800 viewport (playwright.config.ts) with the
// default perspective view. If the layout or camera changes, update these and
// refresh the baselines with `npm run test:e2e -- --update-snapshots`.
const PENDANT = { x: 641, y: 341 };
const FLOOR_LAMP = { x: 350, y: 398 };
const EMPTY_SPACE = { x: 330, y: 120 };

/** Opens the demo and returns the page and console errors seen so far (and from now on). */
async function openDemo(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  // The viewport appends its canvas once the renderer has started.
  await expect(page.locator('lsim-viewport canvas')).toBeVisible();
  return errors;
}

const selectedCount = (page: Page) => page.getByText(/^Seleccionadas: \d+$/);

test('renders the shell in Spanish with the starter scene', async ({ page }) => {
  const errors = await openDemo(page);
  await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();
  await expect(page.getByText('Luminarias: 7')).toBeVisible();
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 0');
  await expect(page).toHaveScreenshot('starter-scene.png');
  expect(errors).toEqual([]);
});

test('click selects, Shift-click adds, empty space and Esc clear', async ({ page }) => {
  const errors = await openDemo(page);

  await page.mouse.click(PENDANT.x, PENDANT.y);
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  await expect(page).toHaveScreenshot('pendant-highlighted.png');

  await page.keyboard.down('Shift');
  await page.mouse.click(FLOOR_LAMP.x, FLOOR_LAMP.y);
  await page.keyboard.up('Shift');
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 2');

  await page.keyboard.press('Escape');
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 0');

  await page.mouse.click(PENDANT.x, PENDANT.y);
  await page.mouse.click(EMPTY_SPACE.x, EMPTY_SPACE.y);
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 0');
  await expect(page).toHaveScreenshot('starter-scene.png');
  expect(errors).toEqual([]);
});

test('adds products from the catalog by click and by drag and drop', async ({ page }) => {
  const errors = await openDemo(page);

  await page.getByRole('button', { name: /Lámpara de mesa 5 W/ }).click();
  await expect(page.getByText('Luminarias: 8')).toBeVisible();
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');

  await page
    .getByRole('button', { name: /Colgante 48 W/ })
    .dragTo(page.locator('lsim-viewport'), { targetPosition: { x: 200, y: 600 } });
  await expect(page.getByText('Luminarias: 9')).toBeVisible();
  expect(errors).toEqual([]);
});

test('search filters the catalog, ignoring accents', async ({ page }) => {
  await openDemo(page);
  const cards = page.locator('lsim-catalog-panel .card');
  await expect(cards).toHaveCount(6);
  await page.getByPlaceholder('Buscar productos').fill('lampara');
  await expect(cards).toHaveCount(2);
  await page.getByPlaceholder('Buscar productos').fill('zzz');
  await expect(page.getByText('Ningún producto coincide con la búsqueda.')).toBeVisible();
});

test('the scene tab shows totals and selects from the list', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('tab', { name: 'Escena' }).click();
  // Starter layout: 48 + 3 × 7 + 12 + 6 + 9 = 96 W and 4200 + 3 × 560 + 1000 + 420 + 806 = 8106 lm.
  await expect(page.locator('lsim-scene-panel .stat', { hasText: 'Potencia' })).toContainText('96');
  await expect(page.locator('lsim-scene-panel .stat', { hasText: 'Flujo' })).toContainText('8.106');

  const row = page.getByRole('option', { name: /Colgante 48 W 1/ });
  await row.click();
  await expect(row).toHaveAttribute('aria-selected', 'true');
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  await expect(page).toHaveScreenshot('scene-tab-pendant-selected.png');
});

test('the inspector edits the room when nothing is selected', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByRole('heading', { name: 'Ambiente', exact: true })).toBeVisible();
  const width = page.getByRole('textbox', { name: 'Ancho' });
  await width.fill('6');
  await width.press('Enter');
  // 6 × 4 m = 24 m²; the comma decimal is accepted too.
  await expect(page.getByText(/Área 24 m²/)).toBeVisible();
  await width.fill('5,5');
  await width.press('Enter');
  await expect(page.getByText(/Área 22 m²/)).toBeVisible();
  await expect(width).toHaveValue('5,50');
});

test('the inspector edits, duplicates and deletes the selected luminaire', async ({ page }) => {
  const errors = await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await expect(page.getByRole('heading', { name: 'Luminaria', exact: true })).toBeVisible();

  await page.getByRole('slider', { name: 'Atenuación' }).fill('0.5');
  await page.getByRole('tab', { name: 'Escena' }).click();
  await expect(page.getByRole('option', { name: /Colgante 48 W 1/ })).toContainText('50%');
  await expect(page).toHaveScreenshot('inspector-pendant-dimmed.png');

  await page.getByRole('button', { name: 'Duplicar' }).click();
  await expect(page.getByText('Luminarias: 8')).toBeVisible();
  await expect(page.getByRole('option', { name: /Colgante 48 W 2/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await page.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByText('Luminarias: 7')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ambiente', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('several selected luminaires share one inspector', async ({ page }) => {
  await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await page.keyboard.down('Shift');
  await page.mouse.click(FLOOR_LAMP.x, FLOOR_LAMP.y);
  await page.keyboard.up('Shift');
  await expect(page.getByText('2 luminarias seleccionadas')).toBeVisible();
  await page.getByRole('button', { name: 'Apagar' }).click();
  await page.getByRole('tab', { name: 'Escena' }).click();
  await expect(page.getByRole('option', { name: /Lámpara de pie 9 W 1/ })).toContainText('apagada');
  await expect(page.getByRole('option', { name: /Colgante 48 W 1/ })).toContainText('apagada');
});

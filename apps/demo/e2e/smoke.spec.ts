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

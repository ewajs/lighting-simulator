import { expect, test, type Page } from '@playwright/test';

// Portrait phone (390 × 844) with touch. Screen points are for the default view.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const PENDANT = { x: 195, y: 399 };
const EMPTY_SPACE = { x: 195, y: 150 };

async function openDemo(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('lxs-viewport canvas')).toBeVisible();
}

const sheetHeading = (page: Page, name: string) =>
  page.locator('lxs-sheet').getByRole('heading', { name, exact: true });

test('full-screen viewport with a tab bar instead of side panels', async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('lxs-app')).toHaveAttribute('phone', '');
  await expect(page.getByRole('tab', { name: 'Propiedades' })).toBeVisible();
  await expect(page.locator('lxs-library')).toHaveCount(0);
  await expect(page.locator('lxs-sheet')).toHaveCount(0);
  await expect(page).toHaveScreenshot('phone-default.png');
});

test('tabs open sheets; the active tab, ✕ and the size toggle behave', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('tab', { name: 'Escena' }).tap();
  await expect(sheetHeading(page, 'Escena')).toBeVisible();
  await page.getByRole('tab', { name: 'Escena' }).tap();
  await expect(page.locator('lxs-sheet')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Vista' }).tap();
  await page.getByRole('button', { name: 'Altura completa' }).tap();
  await expect(page.locator('lxs-sheet')).toHaveAttribute('expanded', '');
  await page.getByRole('button', { name: 'Cerrar' }).tap();
  await expect(page.locator('lxs-sheet')).toHaveCount(0);
});

test('adding from the catalog switches to the new luminaire’s properties', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('tab', { name: 'Catálogo' }).tap();
  await page.getByRole('button', { name: /Colgante 48 W/ }).tap();
  await expect(sheetHeading(page, 'Propiedades')).toBeVisible();
  await expect(page.getByText('Colgante 48 W 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Atenuación' })).toBeVisible();
  await expect(page).toHaveScreenshot('phone-properties.png');
});

test('tapping a fixture opens its properties; tapping empty space closes them', async ({
  page,
}) => {
  await openDemo(page);
  await page.touchscreen.tap(PENDANT.x, PENDANT.y);
  await expect(sheetHeading(page, 'Propiedades')).toBeVisible();
  await expect(page.getByText('Colgante 48 W 1', { exact: true })).toBeVisible();
  await page.touchscreen.tap(EMPTY_SPACE.x, EMPTY_SPACE.y);
  await expect(page.locator('lxs-sheet')).toHaveCount(0);
});

test('the ⋯ menu switches language and theme', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Más opciones' }).tap();
  await page.getByRole('radio', { name: 'EN' }).tap();
  await expect(page.getByRole('tab', { name: 'Properties' })).toBeVisible();
  await page.getByRole('button', { name: 'More options' }).tap();
  await page.getByRole('menuitem', { name: 'Light theme' }).tap();
  await expect(page.locator('lxs-app')).toHaveAttribute('data-lxs-theme', 'light');
});

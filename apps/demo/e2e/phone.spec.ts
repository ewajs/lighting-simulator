import { expect, ready, test, type Page } from './fixtures';

// Portrait phone (390 × 844) with touch. Screen points are for the default view.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const PENDANT = { x: 195, y: 387 };
const EMPTY_SPACE = { x: 195, y: 150 };

async function openDemo(page: Page): Promise<void> {
  await page.goto('/');
  await ready(page);
}

const sheetHeading = (page: Page, name: string) =>
  page.locator('lxs-sheet').getByRole('heading', { name, exact: true });

/** Closes the open sheet with ✕ and reports, a frame later, whether it's still there sliding out. */
const closeSheetAndLook = (page: Page) =>
  page.locator('lxs-sheet').evaluate(async (sheet) => {
    sheet.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')!.click();
    await new Promise(requestAnimationFrame);
    return sheet.isConnected && sheet.getAnimations().some((a) => a.playState === 'running');
  });

test(
  'full-screen viewport with a tab bar instead of side panels',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await openDemo(page);
    await expect(page.locator('lxs-app')).toHaveAttribute('phone', '');
    await expect(page.getByRole('tab', { name: 'Propiedades' })).toBeVisible();
    await expect(page.locator('lxs-library')).toHaveCount(0);
    await expect(page.locator('lxs-sheet')).toHaveCount(0);
    await expect(page).toHaveScreenshot('phone-default.png');
  },
);

test(
  'tabs open sheets; the active tab, ✕ and the size toggle behave',
  { tag: '@all-browsers' },
  async ({ page }) => {
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
  },
);

test(
  'sheets slide out before they go, and go at once with reduced motion',
  { tag: '@all-browsers' },
  async ({ page }) => {
    for (const motion of ['no-preference', 'reduce'] as const) {
      await page.emulateMedia({ reducedMotion: motion });
      await openDemo(page);
      await page.getByRole('tab', { name: 'Escena' }).tap();
      await expect(sheetHeading(page, 'Escena')).toBeVisible();
      expect(await closeSheetAndLook(page)).toBe(motion === 'no-preference');
      await expect(page.locator('lxs-sheet')).toHaveCount(0);
    }
  },
);

test(
  'adding from the catalog switches to the new luminaire’s properties',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await openDemo(page);
    await page.getByRole('tab', { name: 'Catálogo' }).tap();
    await page.getByRole('button', { name: /Colgante lineal/ }).tap();
    await expect(sheetHeading(page, 'Propiedades')).toBeVisible();
    await expect(
      page.getByText('Colgante lineal directo/indirecto 47 W (IES) 2', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Atenuación' })).toBeVisible();
    await expect(page).toHaveScreenshot('phone-properties.png');
  },
);

test(
  'tapping a fixture opens its properties; tapping empty space closes them',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await openDemo(page);
    await page.touchscreen.tap(PENDANT.x, PENDANT.y);
    await expect(sheetHeading(page, 'Propiedades')).toBeVisible();
    await expect(
      page.getByText('Colgante lineal directo/indirecto 47 W (IES) 1', { exact: true }),
    ).toBeVisible();
    await page.touchscreen.tap(EMPTY_SPACE.x, EMPTY_SPACE.y);
    await expect(page.locator('lxs-sheet')).toHaveCount(0);
  },
);

test('the ⋯ menu switches language and theme', { tag: '@all-browsers' }, async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Más opciones' }).tap();
  await page.getByRole('radio', { name: 'EN', exact: true }).tap();
  await expect(page.getByRole('tab', { name: 'Properties' })).toBeVisible();
  await page.getByRole('button', { name: 'More options' }).tap();
  await page.getByRole('menuitem', { name: 'Light theme' }).tap();
  await expect(page.locator('lxs-app')).toHaveAttribute('data-lxs-theme', 'light');
});

test.describe('landscape phone (844 × 390)', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const PENDANT = { x: 458, y: 194 };

  test('the tab bar becomes a left rail', { tag: '@all-browsers' }, async ({ page }) => {
    await openDemo(page);
    await expect(page.locator('lxs-app')).toHaveAttribute('landscape', '');
    const rail = (await page.locator('lxs-tab-bar').boundingBox())!;
    expect(rail.x).toBe(0);
    expect(rail.height).toBeGreaterThan(rail.width);
    await expect(page).toHaveScreenshot('phone-landscape-default.png');
  });

  test(
    'sheets slide in from the right and can take the full width',
    { tag: '@all-browsers' },
    async ({ page }) => {
      await openDemo(page);
      await page.touchscreen.tap(PENDANT.x, PENDANT.y);
      await expect(sheetHeading(page, 'Propiedades')).toBeVisible();
      const sheet = page.locator('lxs-sheet');
      // Right half of the screen, leaving the 3D view visible on the left.
      expect((await sheet.boundingBox())!.x).toBeGreaterThan(844 * 0.4);
      await expect(page).toHaveScreenshot('phone-landscape-properties.png');

      await page.getByRole('button', { name: 'Ancho completo' }).tap();
      await expect(sheet).toHaveAttribute('expanded', '');
      await expect(page.getByRole('button', { name: 'Medio ancho' })).toBeVisible();
    },
  );
});

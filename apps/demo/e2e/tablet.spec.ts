import { expect, test, type Page } from './fixtures';

// Tablet sizes with a touch screen. Screen points are for the default view at
// each size; see smoke.spec.ts for how to refresh them.

/** Holds a finger still at (x, y) for longer than LONG_PRESS_MS (500 ms). Playwright has no long-press API. */
async function longPress(page: Page, x: number, y: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function openDemo(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('lxs-viewport canvas')).toBeVisible();
}

const selectedCount = (page: Page) => page.getByText(/^Seleccionadas: \d+$/);

test.describe('landscape tablet (1024 × 768, touch)', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true });
  const PENDANT = { x: 385, y: 363 };
  const FLOOR_LAMP = { x: 167, y: 405 };

  test('starts with the library collapsed and touch-sized controls', async ({ page }) => {
    await openDemo(page);
    await expect(page.locator('lxs-app')).toHaveAttribute('library-collapsed', '');
    const viewButton = page.getByRole('button', { name: 'Planta', exact: true });
    expect((await viewButton.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    await expect(page).toHaveScreenshot('tablet-landscape.png');
  });

  test('tap selects, long press adds to the selection', async ({ page, browserName }) => {
    // Long press is driven through Chrome's DevTools protocol, which WebKit doesn't have.
    test.skip(browserName !== 'chromium', 'needs CDP touch events');

    await openDemo(page);
    await page.touchscreen.tap(PENDANT.x, PENDANT.y);
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
    await longPress(page, FLOOR_LAMP.x, FLOOR_LAMP.y);
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 2');
    await expect(page.getByText('2 luminarias seleccionadas')).toBeVisible();
  });

  test('tapping a product adds it; long press on a list row toggles it', async ({
    page,
    browserName,
  }) => {
    // Long press is driven through Chrome's DevTools protocol, which WebKit doesn't have.
    test.skip(browserName !== 'chromium', 'needs CDP touch events');

    await openDemo(page);
    await page.getByRole('tab', { name: 'Catálogo' }).tap();
    await page.getByRole('button', { name: /Lámpara de mesa 5 W/ }).tap();
    await expect(page.getByText('Luminarias: 8')).toBeVisible();
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');

    await page.getByRole('tab', { name: 'Escena' }).tap();
    const row = page.getByRole('option', { name: /Colgante 48 W 1/ });
    const box = (await row.boundingBox())!;
    await longPress(page, box.x + box.width / 2, box.y + box.height / 2);
    await expect(row).toHaveAttribute('aria-selected', 'true');
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 2');
  });
});

test.describe('portrait tablet (820 × 1180, touch)', () => {
  test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true });
  const PENDANT = { x: 434, y: 564 };
  const EMPTY_SPACE = { x: 420, y: 250 };

  test('the inspector sheet starts folded, opens on selection and folds when cleared', async ({
    page,
  }) => {
    await openDemo(page);
    const header = page.getByRole('button', { name: 'Ambiente' });
    await expect(header).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('textbox', { name: 'Ancho' })).toBeHidden();

    await page.touchscreen.tap(PENDANT.x, PENDANT.y);
    await expect(page.getByRole('button', { name: 'Luminaria' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(page.getByRole('slider', { name: 'Atenuación' })).toBeVisible();
    await expect(page).toHaveScreenshot('tablet-portrait-sheet-open.png');

    await page.touchscreen.tap(EMPTY_SPACE.x, EMPTY_SPACE.y);
    await expect(header).toHaveAttribute('aria-expanded', 'false');

    await header.tap();
    await expect(page.getByRole('textbox', { name: 'Ancho' })).toBeVisible();
  });
});

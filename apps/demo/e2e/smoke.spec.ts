import { expect, test, type Page } from '@playwright/test';

// Screen points at the fixed 1280×800 viewport (playwright.config.ts) with the
// default perspective view. If the starter layout or camera changes, update
// these and refresh the baselines with `npm run test:e2e -- --update-snapshots`.
const PENDANT = { x: 640, y: 323 };
const EMPTY_SPACE = { x: 60, y: 60 };

/** Opens the demo and returns the page and console errors seen so far (and from now on). */
async function openDemo(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  // init() appends the canvas once the renderer has started.
  await expect(page.locator('#viewport canvas')).toBeVisible();
  return errors;
}

test('renders the starter scene', async ({ page }) => {
  const errors = await openDemo(page);
  const box = await page.locator('#viewport canvas').boundingBox();
  expect(box).toMatchObject({ width: 1280, height: 800 });
  await expect(page).toHaveScreenshot('starter-scene.png');
  expect(errors).toEqual([]);
});

test('clicking a fixture outlines it, clicking empty space clears it', async ({ page }) => {
  const errors = await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await expect(page).toHaveScreenshot('pendant-highlighted.png');
  await page.mouse.click(EMPTY_SPACE.x, EMPTY_SPACE.y);
  await expect(page).toHaveScreenshot('starter-scene.png');
  expect(errors).toEqual([]);
});

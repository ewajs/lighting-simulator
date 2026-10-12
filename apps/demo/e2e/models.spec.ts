import { expect, test, type Page } from './fixtures';

// Fixture models from the demo's ModelProvider (ADR 0043). Screen points are
// for the default view at 1280×800, as in smoke.spec.ts.
const PENDANT = { x: 642, y: 356 };

async function openDemo(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('lxs-viewport canvas')).toBeVisible();
}

test('IES products load their model once each, without warnings', async ({ page }) => {
  const modelStatus = new Map<string, number[]>();
  page.on('response', (response) => {
    const file = /\/models\/([^/]+\.glb)$/.exec(response.url())?.[1];
    if (file) modelStatus.set(file, [...(modelStatus.get(file) ?? []), response.status()]);
  });
  // Errors, and warnings about models: on WebGL 2, three.js also warns about the fallback.
  const problems: string[] = [];
  page.on('console', (message) => {
    const aboutModels = /model|gltf/i.test(message.text());
    if (message.type() === 'error' || (message.type() === 'warning' && aboutModels)) {
      problems.push(message.text());
    }
  });
  await openDemo(page);
  // The starter scene uses four; the downlight is added to have all five.
  await page.getByRole('button', { name: /Downlight 16 W \(IES\)/ }).click();
  await expect(page.getByText('Luminarias: 6')).toBeVisible();
  await expect
    .poll(() => Object.fromEntries(modelStatus))
    .toEqual({
      'ies-downlight.glb': [200],
      'ies-wall-washer.glb': [200],
      'ies-track-spot.glb': [200],
      'ies-linear-pendant.glb': [200],
      'ies-wall-up-down.glb': [200],
    });
  expect(problems).toEqual([]);
});

test('the linear pendant hangs from two cables, close up', async ({ page }) => {
  await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await page.keyboard.press('f');
  await page.keyboard.press('Escape');
  await expect(page).toHaveScreenshot('linear-pendant-close-up.png');
});

test('a model that isn’t a .glb falls back to the placeholder, with a warning', async ({
  page,
  allowConsole,
}) => {
  allowConsole.push(/\[models\] "ies-linear-pendant"/);
  await page.route('**/models/ies-linear-pendant.glb', (route) =>
    route.fulfill({ status: 200, body: 'not a model' }),
  );
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  await openDemo(page);
  await expect
    .poll(() => warnings)
    .toContainEqual(expect.stringMatching(/\[models\] "ies-linear-pendant".*glTF/));
  // Still there and selectable, drawn as the placeholder.
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await expect(page.getByText(/^Seleccionadas: 1$/)).toBeVisible();
});

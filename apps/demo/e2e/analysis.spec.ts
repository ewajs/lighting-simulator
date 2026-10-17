import { expect, ready, test, type Page } from './fixtures';

// The Analysis panel (ADR 0064): the illuminance calculation, run in a Web
// Worker as the scene and the settings change.

async function openAnalysis(page: Page): Promise<void> {
  await page.goto('/');
  await ready(page);
  await page.getByRole('tab', { name: 'Análisis' }).click();
  await expect(calculated(page)).toBeVisible();
}

const panel = (page: Page) => page.locator('lxs-analysis-panel');
const calculated = (page: Page) => panel(page).getByText(/^Calculado en \d+ ms$/);

/** The work plane's average, in lx, as the panel shows it (es-AR groups thousands with a dot). */
async function average(page: Page): Promise<number> {
  const text = await panel(page).locator('.big').innerText();
  return Number(text.replace(/[^\d,]/g, '').replace(',', '.'));
}

/** Sets a number field by its label, as typing a value and pressing Enter. */
async function setField(page: Page, label: string, value: string): Promise<void> {
  const field = panel(page).getByRole('textbox', { name: label });
  await field.fill(value);
  await field.press('Enter');
}

test('opening Analysis calculates the starter scene: the work plane first, then every surface', async ({
  page,
}) => {
  await openAnalysis(page);
  expect(await average(page)).toBeGreaterThan(50);
  for (const surface of ['Piso', 'Cielorraso', 'Pared izquierda', 'Pared del frente']) {
    await expect(panel(page).getByRole('cell', { name: surface, exact: true })).toBeVisible();
  }
  await expect(panel(page)).toHaveScreenshot('analysis-panel.png', {
    // The time it took varies from run to run.
    mask: [calculated(page)],
  });
});

test('the maintenance factor scales every result, recalculated as it changes', async ({ page }) => {
  await openAnalysis(page);
  const maintained = await average(page);
  await setField(page, 'Factor de mantenimiento', '1');
  await expect.poll(() => average(page)).not.toBe(maintained);
  // Results are maintained values: proportional to the factor (0.8 by default).
  expect((await average(page)) / maintained).toBeCloseTo(1.25, 2);
});

test('without auto-calculation, results go out of date until Calculate', async ({ page }) => {
  await openAnalysis(page);
  const before = await average(page);
  await panel(page)
    .getByRole('switch', { name: /Calcular mientras edito/ })
    .uncheck();
  await setField(page, 'Factor de mantenimiento', '0,5');
  await expect(panel(page).getByText('Desactualizado')).toBeVisible();
  expect(await average(page)).toBe(before);
  await panel(page).getByRole('button', { name: 'Calcular', exact: true }).click();
  await expect(calculated(page)).toBeVisible();
  expect((await average(page)) / before).toBeCloseTo(0.5 / 0.8, 2);
});

test('switching bounced light off leaves direct light only, and furniture in it off too', async ({
  page,
}) => {
  await openAnalysis(page);
  const withBounces = await average(page);
  const bounce = panel(page).getByRole('switch', { name: /Luz que rebota/ });
  const furniture = panel(page).getByRole('switch', { name: /Muebles en la luz que rebota/ });
  await bounce.uncheck();
  await expect.poll(() => average(page)).toBeLessThan(withBounces);
  await expect(furniture).toBeDisabled();
  await expect(furniture).not.toBeChecked();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the Analysis tab opens a sheet with the results', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.getByRole('tab', { name: 'Análisis' }).tap();
    await expect(
      page.locator('lxs-sheet').getByRole('heading', { name: 'Análisis' }),
    ).toBeVisible();
    await expect(calculated(page)).toBeVisible();
    expect(await average(page)).toBeGreaterThan(50);
  });
});

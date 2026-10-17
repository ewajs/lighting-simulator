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
const calculated = (page: Page) => panel(page).getByText(/^Calculado en [\d.]+ ms$/);

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
    // The time it took varies from run to run, and a late model can start another calculation.
    mask: [panel(page).getByRole('status')],
  });
});

test("the panel's header is as tall as the catalog's, though the results overflow", async ({
  page,
}) => {
  await page.goto('/');
  await ready(page);
  const header = (panelName: string) => page.locator(`${panelName} .panel-header`);
  const catalog = (await header('lxs-catalog-panel').boundingBox())!.height;
  await page.getByRole('tab', { name: 'Análisis' }).click();
  await expect(calculated(page)).toBeVisible();
  expect((await header('lxs-analysis-panel').boundingBox())!.height).toBe(catalog);
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

test('shadow detail splits the luminaires into finer cells, and recalculates', async ({ page }) => {
  await openAnalysis(page);
  const detail = panel(page).getByRole('combobox', { name: 'Detalle de las sombras' });
  await expect(detail).toHaveValue('0.1');
  const coarse = await panel(page).locator('.big').innerText();
  await detail.selectOption({ label: '2,5 cm, más exacto' });
  await expect(detail).toHaveValue('0.025');
  // The starter's 1.2 m pendant is close to the work plane: finer cells change its light there.
  await expect.poll(() => panel(page).locator('.big').innerText()).not.toBe(coarse);
  await expect(calculated(page)).toBeVisible();
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

test(
  'the Iluminancia view draws the calculated light in false colour, with its legend',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.getByRole('radio', { name: 'Iluminancia' }).click();
    const legend = page.locator('lxs-illuminance-legend');
    await expect(legend.getByText('Iluminancia (lx)')).toBeVisible();
    // It calculates on its own, the Analysis tab closed; the note goes once it's current.
    await expect(legend.locator('.note')).toHaveCount(0);
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('illuminance-view.png');
  },
);

test('key 3 switches to the Iluminancia view, 1 back', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.keyboard.press('3');
  await expect(page.getByRole('radio', { name: 'Iluminancia' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.keyboard.press('1');
  await expect(page.locator('lxs-illuminance-legend')).toHaveCount(0);
});

/** The middle of the table, on the work plane, in the default view at 1280 × 800 (smoke.spec.ts). */
const WORK_PLANE = { x: 640, y: 455 };

/** The probe's figures: total, direct and bounced lux, and the surface. */
async function probeReading(page: Page) {
  const text = await page.locator('lxs-probe').evaluate((probe) => probe.shadowRoot!.textContent);
  const numbers = [...text.matchAll(/[\d.]+/g)].map((m) => Number(m[0].replace('.', '')));
  return { total: numbers[0]!, direct: numbers[1]!, bounced: numbers[2]!, text };
}

test(
  'hovering the illuminance view reads the light at that point, direct and bounced',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.getByRole('radio', { name: 'Iluminancia' }).click();
    await expect(page.locator('lxs-illuminance-legend .note')).toHaveCount(0);
    await page.mouse.move(WORK_PLANE.x, WORK_PLANE.y);
    await page.mouse.move(WORK_PLANE.x + 2, WORK_PLANE.y + 2);
    const probe = page.locator('lxs-probe');
    await expect(probe).toBeVisible();
    await expect.poll(async () => (await probeReading(page)).text).toContain('Plano de trabajo');
    const { total, direct, bounced } = await probeReading(page);
    expect(total).toBeGreaterThan(0);
    // Each figure is rounded on its own.
    expect(Math.abs(direct + bounced - total)).toBeLessThanOrEqual(1);
    await page.mouse.move(5, 5);
    await expect(probe).toHaveCount(0);
  },
);

test.describe('probing on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a tap in the illuminance view reads the light there', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.getByRole('tab', { name: 'Vista' }).tap();
    await page.getByRole('radio', { name: 'Iluminancia' }).tap();
    await page.getByRole('tab', { name: 'Vista' }).tap();
    const box = (await page.locator('lxs-viewport').boundingBox())!;
    // The legend is in the closed sheet, so tap until the first calculation has answered.
    await expect(async () => {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await expect(page.locator('lxs-probe')).toBeVisible({ timeout: 1000 });
    }).toPass();
  });
});

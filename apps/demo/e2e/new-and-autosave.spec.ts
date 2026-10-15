import { expect, test, type Page } from './fixtures';

// New from room templates, and autosave (ADR 0052).

async function openDemo(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('lxs-viewport canvas')).toBeVisible();
}

const luminaireCount = (page: Page) => page.getByText(/^Luminarias: \d+$/);
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Nueva escena' });
const card = (page: Page, name: string) =>
  dialog(page).getByRole('button', { name: new RegExp(`^${name}`) });

test('New offers an empty room and the host’s templates, each with its plan', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Nuevo…' }).click();
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator('lxs-new-scene .card')).toHaveText([
    /Ambiente vacío\s*5 × 4 m\s*$/,
    /Comedor\s*5 × 4 m · 5 luminarias · 7 muebles/,
    /Living\s*5,5 × 4,5 m · 6 luminarias · 6 muebles/,
    /Dormitorio\s*4 × 4 m · 5 luminarias · 5 muebles/,
    /Oficina en casa\s*4 × 3,5 m · 4 luminarias · 5 muebles/,
    /Local\s*7 × 5 m · 6 luminarias · 7 muebles/,
  ]);
  await expect(dialog(page)).toHaveScreenshot('new-scene.png');
  // Shortcuts don't reach the scene behind it; Esc closes it.
  await page.keyboard.press('Delete');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(luminaireCount(page)).toHaveText('Luminarias: 5');
});

test('a template replaces the scene as one undo step', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Nuevo…' }).click();
  await card(page, 'Local').click();
  await expect(dialog(page)).toBeHidden();
  await expect(luminaireCount(page)).toHaveText('Luminarias: 6');
  await expect(page.locator('lxs-notice .notice')).toHaveText('Nueva escena: Local.');
  await expect(page.locator('lxs-viewport')).toHaveScreenshot('shop-template.png');

  await page.keyboard.press('ControlOrMeta+z');
  await expect(luminaireCount(page)).toHaveText('Luminarias: 5');

  await page.getByRole('button', { name: 'Nuevo…' }).click();
  await card(page, 'Ambiente vacío').click();
  await expect(luminaireCount(page)).toHaveText('Luminarias: 0');
});

test('the scene is autosaved and comes back on the next visit', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Nuevo…' }).click();
  await card(page, 'Living').click();
  await expect(luminaireCount(page)).toHaveText('Luminarias: 6');
  // Written a second after the last change.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('lxs-autosave')?.includes('"sofa"')))
    .toBe(true);

  await page.reload();
  await expect(page.locator('lxs-viewport canvas')).toBeVisible();
  await expect(luminaireCount(page)).toHaveText('Luminarias: 6');
  // Where the visit started: nothing to undo.
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeDisabled();
});

test('an autosave that can’t be read is ignored: the starter scene opens', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lxs-autosave', '{"format": "something"}'));
  await openDemo(page);
  await expect(luminaireCount(page)).toHaveText('Luminarias: 5');
});

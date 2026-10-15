import { expect, ready, test, type Page } from './fixtures';

// The getting-started help (ADR 0046). Screenshots freeze its animations.

const dialog = (page: Page) => page.locator('lxs-help dialog');
const title = (page: Page) => dialog(page).locator('h2');

test.describe('first visit', () => {
  test.use({ helpSeen: false });

  test('opens the help, which steps through and is remembered once closed', async ({ page }) => {
    await page.goto('/');
    await expect(dialog(page)).toBeVisible();
    await expect(title(page)).toHaveText('Te damos la bienvenida a Lux Studio');
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeFocused();
    await expect(page).toHaveScreenshot('help-welcome.png');

    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(title(page)).toHaveText('Agregá luminarias');
    await expect(dialog(page)).toContainText('Hacé clic en un producto del catálogo');
    await page.keyboard.press('ArrowRight');
    await expect(title(page)).toHaveText('Elegí y mové');
    await page.keyboard.press('ArrowLeft');
    await expect(title(page)).toHaveText('Agregá luminarias');

    // The last card, through its dot: the IES step (the demo has import on) and the manual.
    await page.getByRole('button', { name: 'Paso 8 de 8' }).click();
    await expect(title(page)).toHaveText('Probá tu propio archivo IES');
    await expect(page.getByRole('link', { name: /Ver el manual completo/ })).toHaveAttribute(
      'href',
      /\/manual\/$/,
    );
    await page.getByRole('button', { name: 'Empezar' }).click();
    await expect(dialog(page)).toBeHidden();

    await page.reload();
    await ready(page);
    await expect(dialog(page)).toBeHidden();
  });
});

test('the ? button reopens it, and Esc closes it', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.keyboard.press('ControlOrMeta+a'); // Something to delete, if a shortcut got through.
  await expect(dialog(page)).toBeHidden();
  await page.getByRole('button', { name: 'Ayuda' }).click();
  await expect(title(page)).toHaveText('Te damos la bienvenida a Lux Studio');
  // Shortcuts don't reach the app behind it: Delete removes nothing.
  await page.keyboard.press('Delete');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByText('Luminarias: 5')).toBeVisible();
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the ⋯ menu opens it, worded for touch', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.getByRole('button', { name: 'Más opciones' }).tap();
    await page.getByRole('menuitem', { name: 'Ayuda' }).tap();
    await page.getByRole('button', { name: 'Siguiente' }).tap();
    await expect(dialog(page)).toContainText('Tocá un producto del catálogo');
    await expect(page).toHaveScreenshot('help-phone.png');
  });
});

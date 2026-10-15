import type { Browser } from '@playwright/test';
import { expect, test, type Page } from './fixtures';

// Share links (ADR 0053): the demo's links carry the scene after #scene=.
// The clipboard and the share sheet are stood in for, to read what was shared.

type SharingWindow = Window & { copied?: string; shared?: ShareData };

/** Opens the demo with a clipboard that keeps what's copied, or refuses it. */
async function openDemo(page: Page, clipboard: 'works' | 'refuses' = 'works'): Promise<void> {
  await page.addInitScript((mode) => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (text: string) => {
          if (mode === 'refuses') return Promise.reject(new DOMException('No', 'NotAllowedError'));
          (window as SharingWindow).copied = text;
          return Promise.resolve();
        },
      },
    });
  }, clipboard);
  await page.goto('/');
  await expect(page.locator('lxs-viewport canvas')).toBeVisible();
}

/** A page in a fresh browser profile: someone else, with nothing autosaved. */
async function someoneElse(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('lxs-help-seen', '1'));
  return page;
}

const luminaireCount = (page: Page) => page.getByText(/^Luminarias: \d+$/);
const notice = (page: Page) => page.locator('lxs-notice .notice');

async function pickTemplate(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Nuevo…' }).click();
  await page.locator('lxs-new-scene .card', { hasText: name }).click();
}

test('Share copies a link that opens a copy of the scene for someone else', async ({
  page,
  browser,
}) => {
  await openDemo(page);
  await pickTemplate(page, 'Local');
  await expect(luminaireCount(page)).toHaveText('Luminarias: 6');
  await page.getByRole('button', { name: 'Compartir' }).click();
  await expect(notice(page)).toHaveText(
    'Enlace copiado. Quien lo tenga puede abrir una copia de esta escena.',
  );
  const link = await page.evaluate(() => (window as SharingWindow).copied!);
  expect(link).toMatch(/#scene=[A-Za-z0-9_-]+$/);
  expect(link.length).toBeLessThan(4000);

  const other = await someoneElse(browser);
  const problems: string[] = [];
  other.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(m.text()));
  await other.goto(link);
  await expect(luminaireCount(other)).toHaveText('Luminarias: 6');
  await expect(notice(other)).toHaveText(
    'Se abrió una escena compartida. Deshacer trae de vuelta la tuya.',
  );
  // A reload keeps their edits: the scene is gone from the address bar.
  expect(other.url()).not.toContain('#scene=');
  // Their own scene, the starter, is one undo away.
  await other.keyboard.press('ControlOrMeta+z');
  await expect(luminaireCount(other)).toHaveText('Luminarias: 5');
  expect(problems.filter((p) => !/WebGPU/.test(p))).toEqual([]);
  await other.context().close();
});

test('a damaged link is reported and changes nothing', async ({ page, allowConsole }) => {
  allowConsole.push(/\[ui\] Couldn't open the shared link/);
  await page.goto('/#scene=this-is-not-a-scene');
  await expect(page.locator('lxs-viewport canvas')).toBeVisible();
  await expect(notice(page)).toHaveText(
    'La escena de este enlace está dañada y no se puede abrir.',
  );
  await expect(luminaireCount(page)).toHaveText('Luminarias: 5');
});

test('when the clipboard refuses, the link is shown to copy by hand', async ({ page }) => {
  await openDemo(page, 'refuses');
  await page.getByRole('button', { name: 'Compartir' }).click();
  await expect(notice(page)).toContainText('Copiá este enlace para compartir la escena:');
  await expect(notice(page).locator('input')).toHaveValue(/#scene=[A-Za-z0-9_-]+$/);
});

test('on a phone, Share opens the share sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      value: (data: ShareData) => {
        (window as SharingWindow).shared = data;
        return Promise.resolve();
      },
    });
  });
  await openDemo(page);
  await page.getByRole('button', { name: 'Más opciones' }).click();
  await page.getByRole('menuitem', { name: 'Compartir' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as SharingWindow).shared?.url))
    .toMatch(/#scene=[A-Za-z0-9_-]+$/);
});

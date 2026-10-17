import { expect, test, type Locator, type Page } from '@playwright/test';

// Screen points for the default camera at 1280×800, as in the demo's e2e tests.
const PENDANT = { x: 642, y: 356 };
const TRACK_SPOT = { x: 523, y: 312 };
const TABLE = { x: 640, y: 455 };
const IES_FILE = '../demo/public/ies/qg63_b35q.ies';
/** The selection outline's amber, for marking the control a screenshot is about. */
const HIGHLIGHT = '#f5b544';

type Language = 'es' | 'en';
const LANGUAGES: readonly Language[] = ['es', 'en'];

const out = (language: Language, name: string) =>
  `pages/public/screenshots/${language}/${name}.png`;

async function open(page: Page, language: Language): Promise<void> {
  // The getting-started help opens on a first visit; these shots are of the app.
  await page.addInitScript(() => localStorage.setItem('lxs-help-seen', '1'));
  await page.goto('/');
  await expect(page.locator('lxs-viewport canvas')).toBeVisible();
  // The demo's own loader covers the page until the scene is drawn.
  await expect(page.locator('#splash')).toHaveCount(0);
  if (language === 'en') {
    // On phones the language switch is in the ⋯ menu.
    const more = page.getByRole('button', { name: 'Más opciones' });
    if (await more.isVisible()) await more.click();
    await page.getByRole('radio', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Catalog', exact: true })).toBeVisible();
  }
  // Let IES files and models arrive and shadows settle.
  await page.waitForTimeout(1200);
}

/** Outlines an element in amber, so the screenshot points at it. */
async function mark(locator: Locator): Promise<void> {
  await locator.evaluate((element, color) => {
    (element as HTMLElement).style.outline = `3px solid ${color}`;
    (element as HTMLElement).style.outlineOffset = '2px';
  }, HIGHLIGHT);
}

/**
 * An area of the page to number, and where its badge goes, as a fraction of
 * its box: 0.5, 0.5 is the centre; above 1 is outside to the right or below.
 */
interface Area {
  readonly locator: Locator;
  readonly at?: readonly [x: number, y: number];
}

/** Numbered badges on areas of the page, for the overview. */
async function number(page: Page, areas: readonly Area[]): Promise<void> {
  const boxes = [];
  for (const { locator, at = [0.5, 0.5] } of areas) {
    const box = await locator.boundingBox();
    boxes.push(box && { x: box.x + box.width * at[0], y: box.y + box.height * at[1] });
  }
  await page.evaluate(
    ({ boxes, color }) => {
      boxes.forEach((box, i) => {
        if (!box) return;
        const badge = document.createElement('div');
        badge.textContent = String(i + 1);
        Object.assign(badge.style, {
          position: 'fixed',
          left: `${box.x - 16}px`,
          top: `${box.y - 16}px`,
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: color,
          color: '#1a1204',
          font: '700 17px/32px system-ui, sans-serif',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgb(0 0 0 / 0.4)',
          zIndex: '10',
        });
        document.body.append(badge);
      });
    },
    { boxes, color: HIGHLIGHT },
  );
}

for (const language of LANGUAGES) {
  test.describe(language, () => {
    test('overview', async ({ page }) => {
      await open(page, language);
      await number(page, [
        { locator: page.locator('lxs-library') },
        { locator: page.locator('lxs-viewport'), at: [0.5, 0.62] },
        // The empty end of the inspector's header.
        { locator: page.locator('lxs-inspector'), at: [0.85, 0.03] },
        // In the empty stretch between undo/redo and the buttons on the right.
        { locator: page.locator('lxs-top-bar'), at: [0.7, 0.5] },
        // Just right of the tools, clear of their labels.
        { locator: page.locator('lxs-viewport-controls .tools'), at: [1.25, 0.5] },
      ]);
      await page.screenshot({ path: out(language, 'overview') });
    });

    test('catalog', async ({ page }) => {
      await open(page, language);
      await page.locator('lxs-library').screenshot({ path: out(language, 'catalog') });
    });

    test('scene list', async ({ page }) => {
      await open(page, language);
      await page.getByRole('tab', { name: language === 'es' ? 'Escena' : 'Scene' }).click();
      await page.mouse.click(PENDANT.x, PENDANT.y);
      await page.locator('lxs-library').screenshot({ path: out(language, 'scene-list') });
    });

    test('selected, with the move arrows', async ({ page }) => {
      await open(page, language);
      await page.mouse.click(PENDANT.x, PENDANT.y);
      await page.locator('lxs-app .stage').screenshot({ path: out(language, 'move-arrows') });
      await page
        .locator('lxs-inspector')
        .screenshot({ path: out(language, 'luminaire-inspector') });
    });

    test('dragging, with a guide and distances', async ({ page }) => {
      await open(page, language);
      await page.mouse.move(TRACK_SPOT.x, TRACK_SPOT.y);
      await page.mouse.down();
      await page.mouse.move(TRACK_SPOT.x - 16, TRACK_SPOT.y, { steps: 6 });
      await page.locator('lxs-app .stage').screenshot({ path: out(language, 'dragging') });
      await page.mouse.up();
    });

    test('aiming', async ({ page }) => {
      await open(page, language);
      await page.mouse.click(TRACK_SPOT.x, TRACK_SPOT.y);
      await page.keyboard.press('e');
      await mark(page.getByRole('radio', { name: language === 'es' ? 'Orientar' : 'Aim' }));
      await page.locator('lxs-app .stage').screenshot({ path: out(language, 'aiming') });
    });

    test('furniture', async ({ page }) => {
      await open(page, language);
      await page
        .getByRole('radio', { name: language === 'es' ? 'Mobiliario' : 'Furniture' })
        .click();
      await page.locator('lxs-library').screenshot({ path: out(language, 'furniture-catalog') });
      await page.mouse.click(TABLE.x, TABLE.y);
      await page
        .locator('lxs-inspector')
        .screenshot({ path: out(language, 'furniture-inspector') });
    });

    test('room', async ({ page }) => {
      await open(page, language);
      await page.locator('lxs-inspector').screenshot({ path: out(language, 'room-inspector') });
    });

    test('views: plan and clay', async ({ page }) => {
      await open(page, language);
      await page.getByRole('radio', { name: language === 'es' ? 'Arcilla' : 'Clay' }).click();
      await page
        .getByRole('button', { name: language === 'es' ? 'Planta' : 'Plan', exact: true })
        .click();
      await page.waitForTimeout(800); // The camera flies to the plan view.
      await page.locator('lxs-app .stage').screenshot({ path: out(language, 'views') });
    });

    test('analysis panel', async ({ page }) => {
      await open(page, language);
      const es = language === 'es';
      await page.getByRole('tab', { name: es ? 'Análisis' : 'Analysis' }).click();
      const panel = page.locator('lxs-analysis-panel');
      await expect(panel.getByText(es ? /^Calculado en/ : /^Calculated in/)).toBeVisible();
      await page.locator('lxs-library').screenshot({ path: out(language, 'analysis-panel') });
      await panel
        .getByRole('switch', {
          name: es ? /Muebles en la luz que rebota/ : /Furniture in bounced light/,
        })
        .scrollIntoViewIfNeeded();
      await page.locator('lxs-library').screenshot({ path: out(language, 'analysis-settings') });
    });

    test('illuminance view, with the probe', async ({ page }) => {
      await open(page, language);
      await page
        .getByRole('radio', { name: language === 'es' ? 'Iluminancia' : 'Illuminance' })
        .click();
      // The legend's note goes once the calculation is in.
      await expect(page.locator('lxs-illuminance-legend .note')).toHaveCount(0);
      await page.mouse.move(TABLE.x, TABLE.y);
      await page.mouse.move(TABLE.x + 2, TABLE.y + 2);
      await expect(page.locator('lxs-probe')).toBeVisible();
      await page.waitForTimeout(300);
      await page.locator('lxs-app .stage').screenshot({ path: out(language, 'illuminance') });
    });

    test('top bar', async ({ page }) => {
      await open(page, language);
      await page.locator('lxs-top-bar').screenshot({ path: out(language, 'top-bar') });
    });

    test('new scene', async ({ page }) => {
      await open(page, language);
      await page.getByRole('button', { name: language === 'es' ? 'Nuevo…' : 'New…' }).click();
      await page.locator('lxs-new-scene dialog').screenshot({ path: out(language, 'new-scene') });
    });

    test('your own IES file', async ({ page }) => {
      await open(page, language);
      await page.locator('lxs-ies-import input[type=file]').setInputFiles(IES_FILE);
      await page.locator('lxs-ies-import').screenshot({ path: out(language, 'ies-import') });
    });

    test.describe('phone', () => {
      test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

      test('phone', async ({ page }) => {
        await open(page, language);
        await page.screenshot({ path: out(language, 'phone') });
        // Selecting opens the Properties sheet by itself.
        await page.touchscreen.tap(195, 380);
        await expect(page.locator('lxs-sheet')).toBeVisible();
        await page.waitForTimeout(400);
        await page.screenshot({ path: out(language, 'phone-properties') });
      });
    });
  });
}

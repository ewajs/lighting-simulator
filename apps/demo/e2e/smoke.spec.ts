import { expect, ready, test, type Page } from './fixtures';

// Screen points at the fixed 1280×800 viewport (playwright.config.ts) with the
// default perspective view. If the layout or camera changes, update these and
// refresh the baselines with `npm run test:e2e -- --update-snapshots=all`.
const PENDANT = { x: 642, y: 356 };
const WALL_LIGHT = { x: 845, y: 437 };
const EMPTY_SPACE = { x: 380, y: 150 };

/** Opens the demo and returns the page and console errors seen so far (and from now on). */
async function openDemo(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  // The viewport appends its canvas once the renderer has started.
  await ready(page);
  return errors;
}

const selectedCount = (page: Page) => page.getByText(/^Seleccionadas: \d+$/);

test(
  'renders the shell in Spanish with the starter scene',
  { tag: '@all-browsers' },
  async ({ page }) => {
    const errors = await openDemo(page);
    await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();
    await expect(page.getByText('Luminarias: 5')).toBeVisible();
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 0');
    await expect(page).toHaveScreenshot('starter-scene.png');
    expect(errors).toEqual([]);
  },
);

test(
  'click selects, Shift-click adds, empty space and Esc clear',
  { tag: '@all-browsers' },
  async ({ page }) => {
    const errors = await openDemo(page);

    await page.mouse.click(PENDANT.x, PENDANT.y);
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('pendant-highlighted.png');

    await page.keyboard.down('Shift');
    await page.mouse.click(WALL_LIGHT.x, WALL_LIGHT.y);
    await page.keyboard.up('Shift');
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 2');

    await page.keyboard.press('Escape');
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 0');

    await page.mouse.click(PENDANT.x, PENDANT.y);
    await page.mouse.click(EMPTY_SPACE.x, EMPTY_SPACE.y);
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 0');
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('starter-view.png');
    expect(errors).toEqual([]);
  },
);

test(
  'adds products from the catalog by click and by drag and drop',
  { tag: '@all-browsers' },
  async ({ page }) => {
    const errors = await openDemo(page);

    await page.getByRole('button', { name: /Lámpara de mesa 5 W/ }).click();
    await expect(page.getByText('Luminarias: 6')).toBeVisible();
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');

    await page
      .getByRole('button', { name: /Colgante 48 W/ })
      .dragTo(page.locator('lxs-viewport'), { targetPosition: { x: 200, y: 600 } });
    await expect(page.getByText('Luminarias: 7')).toBeVisible();
    expect(errors).toEqual([]);
  },
);

test('IES products load their real photometry', { tag: '@all-browsers' }, async ({ page }) => {
  // Status of every IES file request, from page load on: the starter scene uses four of them.
  const iesStatus = new Map<string, number>();
  page.on('response', (response) => {
    const file = /\/ies\/([^/]+\.ies)$/.exec(response.url())?.[1];
    if (file) iesStatus.set(file, response.status());
  });
  const photometryWarnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && /photometry/i.test(message.text())) {
      photometryWarnings.push(message.text());
    }
  });
  const errors = await openDemo(page);
  for (const name of [
    /Downlight 16 W \(IES\)/,
    /Bañador de pared 14 W \(IES\)/,
    /Colgante lineal directo\/indirecto 47 W \(IES\)/,
    /Spot de riel 18° 40 W \(IES\)/,
    /Aplique arriba\/abajo 18 W \(IES\)/,
  ]) {
    await page.getByRole('button', { name }).click();
  }
  await expect(page.getByText('Luminarias: 10')).toBeVisible();
  // Each file is requested once, however many luminaires use it.
  await expect
    .poll(() => Object.fromEntries(iesStatus))
    .toEqual({
      'LX6C15D010-EX6C159030-6LBMH.ies': 200,
      'C3L10935NZ10U-C3RLWCC.ies': 200,
      'HP-2-ID-4ft-H-B-835-ITL85132.008.ies': 200,
      'qg63_b35q.ies': 200,
      'CB3326-L35K-H.ies': 200,
    });
  await expect(page.locator('lxs-viewport')).toHaveScreenshot('ies-products-added.png');
  expect(photometryWarnings).toEqual([]);
  expect(errors).toEqual([]);
});

test('search filters the catalog, ignoring accents', async ({ page }) => {
  await openDemo(page);
  const cards = page.locator('lxs-catalog-panel .card');
  await expect(cards).toHaveCount(11);
  await page.getByPlaceholder('Buscar productos').fill('lampara');
  await expect(cards).toHaveCount(2);
  await page.getByPlaceholder('Buscar productos').fill('zzz');
  await expect(page.getByText('Ningún producto coincide con la búsqueda.')).toBeVisible();
});

test('the scene tab shows totals and selects from the list', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('tab', { name: 'Escena' }).click();
  // Starter layout: 46.7 + 2 × 14 + 40.2 + 18.2 = 133.1 W and 4599 + 2 × 777 + 2913 + 1648 = 10,714 lm.
  await expect(page.locator('lxs-scene-panel .stat', { hasText: 'Potencia' })).toContainText('133');
  await expect(page.locator('lxs-scene-panel .stat', { hasText: 'Flujo' })).toContainText('10.714');

  const row = page.getByRole('option', {
    name: /Colgante lineal directo\/indirecto 47 W \(IES\) 1/,
  });
  await row.click();
  await expect(row).toHaveAttribute('aria-selected', 'true');
  await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
  await expect(page.locator('lxs-viewport')).toHaveScreenshot('scene-tab-pendant-selected.png');
});

test('the inspector edits the room when nothing is selected', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByRole('heading', { name: 'Ambiente', exact: true })).toBeVisible();
  const width = page.getByRole('textbox', { name: 'Ancho' });
  await width.fill('6');
  await width.press('Enter');
  // 6 × 4 m = 24 m²; the comma decimal is accepted too.
  await expect(page.getByText(/Área 24 m²/)).toBeVisible();
  await width.fill('5,5');
  await width.press('Enter');
  await expect(page.getByText(/Área 22 m²/)).toBeVisible();
  await expect(width).toHaveValue('5,50');
});

test('the inspector edits, duplicates and deletes the selected luminaire', async ({ page }) => {
  const errors = await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await expect(page.getByRole('heading', { name: 'Luminaria', exact: true })).toBeVisible();

  await page.getByRole('slider', { name: 'Atenuación' }).fill('0.5');
  await page.getByRole('tab', { name: 'Escena' }).click();
  await expect(
    page.getByRole('option', { name: /Colgante lineal directo\/indirecto 47 W \(IES\) 1/ }),
  ).toContainText('50%');
  await expect(page.locator('lxs-viewport')).toHaveScreenshot('inspector-pendant-dimmed.png');

  await page.getByRole('button', { name: 'Duplicar' }).click();
  await expect(page.getByText('Luminarias: 6')).toBeVisible();
  await expect(
    page.getByRole('option', { name: /Colgante lineal directo\/indirecto 47 W \(IES\) 2/ }),
  ).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByText('Luminarias: 5')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ambiente', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('several selected luminaires share one inspector', async ({ page }) => {
  await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await page.keyboard.down('Shift');
  await page.mouse.click(WALL_LIGHT.x, WALL_LIGHT.y);
  await page.keyboard.up('Shift');
  await expect(page.getByText('2 luminarias seleccionadas')).toBeVisible();
  await page.getByRole('button', { name: 'Apagar' }).click();
  await page.getByRole('tab', { name: 'Escena' }).click();
  await expect(
    page.getByRole('option', { name: /Aplique arriba\/abajo 18 W \(IES\) 1/ }),
  ).toContainText('apagada');
  await expect(
    page.getByRole('option', { name: /Colgante lineal directo\/indirecto 47 W \(IES\) 1/ }),
  ).toContainText('apagada');
});

test(
  'dimming to zero, or switching off, and back keeps rendering',
  { tag: '@all-browsers' },
  async ({ page }) => {
    // Regression: a light losing its shadow made three.js throw every frame.
    const errors = await openDemo(page);
    await page.mouse.click(PENDANT.x, PENDANT.y);
    const slider = page.getByRole('slider', { name: 'Atenuación' });
    await slider.fill('0');
    await expect(page).not.toHaveScreenshot('pendant-highlighted.png');
    await slider.fill('1');
    await slider.blur(); // The focus ring isn't part of what's compared.
    await page.keyboard.press('h');
    await page.keyboard.press('h');
    // Back to full output: the same image as before.
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('pendant-highlighted.png');
    expect(errors).toEqual([]);
  },
);

test('the starter scene is where undo stops', async ({ page }) => {
  // Regression: it was built from undoable edits, so ⌘Z took it apart.
  await openDemo(page);
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeDisabled();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.getByText('Luminarias: 5')).toBeVisible();
  await expect(page.locator('lxs-viewport')).toHaveScreenshot('starter-view.png');
});

test('undo and redo, with one slider drag as one undo step', async ({ page }) => {
  await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  const slider = page.getByRole('slider', { name: 'Atenuación' });
  const box = (await slider.boundingBox())!;
  // Drag from the right end (100%) to the middle in many small moves: many input events, one gesture.
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();

  await page.getByRole('tab', { name: 'Escena' }).click();
  const row = page.getByRole('option', {
    name: /Colgante lineal directo\/indirecto 47 W \(IES\) 1/,
  });
  await expect(row).not.toContainText('100%');

  await page.keyboard.press('ControlOrMeta+z');
  await expect(row).toContainText('100%');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(row).not.toContainText('100%');
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(row).toContainText('100%');
});

test('keyboard shortcuts delete, undo, duplicate and switch off', async ({ page }) => {
  await openDemo(page);
  await page.mouse.click(PENDANT.x, PENDANT.y);
  await page.keyboard.press('Delete');
  await expect(page.getByText('Luminarias: 4')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.getByText('Luminarias: 5')).toBeVisible();

  await page.mouse.click(PENDANT.x, PENDANT.y);
  await page.keyboard.press('ControlOrMeta+d');
  await expect(page.getByText('Luminarias: 6')).toBeVisible();
  await page.keyboard.press('h');
  await page.getByRole('tab', { name: 'Escena' }).click();
  await expect(
    page.getByRole('option', { name: /Colgante lineal directo\/indirecto 47 W \(IES\) 2/ }),
  ).toContainText('apagada');
  await expect(
    page.getByRole('option', { name: /Colgante lineal directo\/indirecto 47 W \(IES\) 1/ }),
  ).toContainText('100%');
});

test(
  'theme, language, collapsed panels and the plan view',
  { tag: '@all-browsers' },
  async ({ page }) => {
    const errors = await openDemo(page);
    await page.getByRole('button', { name: 'Tema claro' }).click();
    await expect(page.locator('lxs-app')).toHaveAttribute('data-lxs-theme', 'light');

    await page.getByRole('radio', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible();
    // The host swaps product names on lxs-locale-change.
    await expect(page.getByRole('button', { name: /Pendant 48 W/ })).toBeVisible();

    await page.getByRole('button', { name: 'Show library' }).click();
    await page.getByRole('button', { name: 'Show inspector' }).click();
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await expect(page).toHaveScreenshot('light-en-collapsed-plan.png');
    expect(errors).toEqual([]);
  },
);

test(
  'screenshots download as neutrally named PNGs of the canvas, without the outline; hosts can cancel them',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await openDemo(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Captura' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^escena-\d{4}-\d{2}-\d{2}-\d{4}\.png$/);

    let downloads = 0;
    page.on('download', () => downloads++);

    /** Takes a screenshot through the UI, cancelling the download like a host would, and describes the PNG. */
    const capture = async () => {
      const result = page.evaluate(
        () =>
          new Promise<{ type: string; width: number; height: number; sha256: string }>(
            (resolve) => {
              document.querySelector('lxs-app')!.addEventListener(
                'lxs-screenshot',
                (event) => {
                  event.preventDefault();
                  const { png } = (event as CustomEvent<{ png: Blob }>).detail;
                  void Promise.all([createImageBitmap(png), png.arrayBuffer()]).then(
                    async ([bitmap, bytes]) => {
                      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
                      const sha256 = Array.from(digest, (b) =>
                        b.toString(16).padStart(2, '0'),
                      ).join('');
                      resolve({
                        type: png.type,
                        width: bitmap.width,
                        height: bitmap.height,
                        sha256,
                      });
                    },
                  );
                },
                { once: true },
              );
            },
          ),
      );
      await page.getByRole('button', { name: 'Captura' }).click();
      return result;
    };

    const plain = await capture();
    const canvas = await page
      .locator('lxs-viewport canvas')
      .evaluate((c: HTMLCanvasElement) => [c.width, c.height]);
    expect(plain.type).toBe('image/png');
    expect([plain.width, plain.height]).toEqual(canvas);

    await page.mouse.click(PENDANT.x, PENDANT.y);
    await expect(selectedCount(page)).toHaveText('Seleccionadas: 1');
    // Renders are deterministic, so without the outline the two PNGs are byte-identical.
    expect((await capture()).sha256).toBe(plain.sha256);
    expect(downloads).toBe(0);
  },
);

test('the catalog filters by mount type and colour temperature', async ({ page }) => {
  await openDemo(page);
  const cards = page.locator('lxs-catalog-panel .card');
  await page.getByRole('combobox', { name: 'Tipo de montaje' }).selectOption({ label: 'Colgante' });
  // The generic pendant and the IES linear pendant.
  await expect(cards).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Tipo de montaje' }).selectOption({ label: 'Montaje' });
  await page
    .getByRole('combobox', { name: 'Temperatura de color' })
    .selectOption({ label: '2700 K' });
  // Wall light, floor lamp and table lamp are 2700 K.
  await expect(cards).toHaveCount(3);
  await page.getByRole('combobox', { name: 'Tipo de montaje' }).selectOption({ label: 'Colgante' });
  await expect(page.getByText('Ningún producto coincide con la búsqueda.')).toBeVisible();
});

test(
  'renders with the backend this project targets',
  { tag: '@all-browsers' },
  async ({ page, browserName }, testInfo) => {
    await openDemo(page);
    const backend = await page
      .locator('lxs-viewport')
      .evaluate((el) => (el as unknown as { backend?: string }).backend);
    // WebKit (Safari) has no WebGPU here, so it falls back like the chrome-webgl2 project.
    const expected = testInfo.project.name === 'chrome' ? 'WebGPU' : 'WebGL 2';
    expect(backend, `${testInfo.project.name} on ${browserName}`).toBe(expected);
  },
);

test('?debug logs each step and shows diagnostics', async ({ page }) => {
  const debugLines: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'debug') debugLines.push(message.text());
  });
  await page.goto('/?debug');
  await ready(page);
  await expect(page.locator('lxs-viewport .diagnostics')).toContainText(/\d+ fps/);
  await expect(page.locator('lxs-viewport .diagnostics')).toContainText('5 luces');
  await expect.poll(() => debugLines).toContainEqual(expect.stringMatching(/^\[scene\] Started/));
  await expect
    .poll(() => debugLines)
    .toContainEqual(expect.stringMatching(/^\[photometry\] "ies-track-spot" in \d+ ms: Palco/));
});

test('without ?debug, nothing extra is shown', async ({ page }) => {
  const debugLines: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'debug') debugLines.push(message.text());
  });
  await openDemo(page);
  await expect(page.locator('lxs-viewport .diagnostics')).toHaveCount(0);
  expect(debugLines).toEqual([]);
});

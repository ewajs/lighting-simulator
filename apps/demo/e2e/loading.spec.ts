import { expect, ready, test, type Page } from './fixtures';

// Loading (ADR 0054): nothing shows with a stand-in. The scene stays hidden
// at start-up and when a whole scene opens, until its files are in; a
// luminaire waits for its IES file; a surface keeps its look until a new
// texture arrives; and a spinner shows when it takes longer than ¼ s.

/** Holds back requests matching `pattern` until `release` is called. */
async function holdBack(page: Page, pattern: string): Promise<() => void> {
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route(pattern, async (route) => {
    await released;
    await route.continue();
  });
  return release;
}

const hiddenScene = (page: Page) => page.locator('lxs-viewport .canvas.hidden');
const pill = (page: Page) => page.locator('lxs-viewport .pill');
const lights = (page: Page) => page.getByText(/^\d+ luces, \d+ con sombras$/);

test('the page shows its loader until the scene is drawn with its IES files', async ({ page }) => {
  const release = await holdBack(page, '**/ies/*.ies');
  await page.goto('/');
  await expect(page.locator('lxs-viewport canvas')).toBeAttached();
  await page.waitForTimeout(500);
  await expect(page.locator('#splash')).toBeVisible();
  await expect(hiddenScene(page)).toHaveCount(1);
  release();
  await ready(page);
  await expect(hiddenScene(page)).toHaveCount(0);
});

test('a luminaire appears once its IES file is in, with a spinner meanwhile', async ({ page }) => {
  // Starts from an autosaved room with one plain downlight, so no IES file is loaded yet.
  await page.addInitScript(() => {
    const surface = { color: '#f2f0ec', reflectance: 0.8 };
    const scene = {
      room: {
        width: 5,
        depth: 4,
        height: 2.7,
        surfaces: { floor: surface, walls: surface, ceiling: surface },
      },
      luminaires: [
        {
          id: 'a',
          productId: 'downlight-7w',
          position: { x: -1, y: 2.7, z: 0 },
          aim: { tiltDeg: 0, panDeg: 0 },
          dimming: 1,
          on: true,
          cct: 3000,
        },
      ],
      furniture: [],
    };
    localStorage.setItem(
      'lxs-autosave',
      JSON.stringify({ format: 'lux-studio-scene', version: 1, scene }),
    );
  });
  await page.goto('/?debug');
  await ready(page);
  await expect(lights(page)).toHaveText('1 luces, 1 con sombras');

  const release = await holdBack(page, '**/ies/*.ies');
  await page.getByRole('button', { name: /Downlight 16 W \(IES\)/ }).click();
  await expect(page.getByText(/^Luminarias: 2$/)).toBeVisible();
  await expect(pill(page)).toHaveText('Cargando…');
  // In the scene, but not drawn with a stand-in light.
  await page.waitForTimeout(600);
  await expect(lights(page)).toHaveText('1 luces, 1 con sombras');

  release();
  await expect(lights(page)).toHaveText('2 luces, 2 con sombras');
  await expect(pill(page)).toHaveCount(0);
});

test('a new floor keeps the old one’s look until its texture is in', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const release = await holdBack(page, '**/textures/stone-tiles.jpg');
  await page
    .locator('lxs-room-inspector section')
    .filter({ has: page.getByRole('heading', { name: 'Piso' }) })
    .getByRole('button', { name: 'Baldosas de piedra' })
    .click();
  await expect(pill(page)).toHaveText('Cargando…');
  // Still oak, not a plain colour: the same picture as before the click.
  await expect(page.locator('lxs-viewport')).toHaveScreenshot('floor-waiting.png', {
    mask: [pill(page)],
  });
  release();
  await expect(pill(page)).toHaveCount(0);
});

test('a template whose files aren’t in yet opens hidden, behind a spinner', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const release = await holdBack(page, '**/textures/concrete.jpg');
  await page.getByRole('button', { name: 'Nuevo…' }).click();
  await page.locator('lxs-new-scene .card', { hasText: 'Oficina en casa' }).click();
  await expect(hiddenScene(page)).toHaveCount(1);
  await expect(page.locator('lxs-viewport .loader')).toHaveText('Cargando escena…');
  release();
  await expect(hiddenScene(page)).toHaveCount(0);
  await expect(page.locator('lxs-viewport .loader')).toHaveCount(0);
});

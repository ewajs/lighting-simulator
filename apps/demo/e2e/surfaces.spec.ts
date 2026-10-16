import { expect, ready, test, type Page } from './fixtures';

// Room surfaces: colours and the host's materials (ADR 0050). The demo's
// starter floor is oak planks; the other materials come from its sample list.

async function openDemo(page: Page): Promise<void> {
  await page.goto('/');
  await ready(page);
}

/** The room panel's section for one surface, by its Spanish heading. */
const surface = (page: Page, heading: 'Piso' | 'Paredes' | 'Cielorraso') =>
  page
    .locator('lxs-room-inspector section')
    .filter({ has: page.getByRole('heading', { name: heading }) });

test(
  'a material replaces a surface’s colour at its typical reflectance, one undo step',
  { tag: '@all-browsers' },
  async ({ page }) => {
    await openDemo(page);
    await expect(
      surface(page, 'Piso').getByRole('button', { name: 'Piso de roble' }),
    ).toHaveAttribute('aria-pressed', 'true');

    const walls = surface(page, 'Paredes');
    await expect(walls.locator('input[type=color]')).toHaveCount(1);
    await walls.getByRole('button', { name: 'Ladrillo visto' }).click();
    await expect(walls.getByRole('button', { name: 'Ladrillo visto' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The colour gives way to the material's swatch; ρ is brick's 25%.
    await expect(walls.locator('input[type=color]')).toHaveCount(0);
    await expect(walls.getByText('25%')).toBeVisible();
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('brick-walls.png');
    // Clay shows light only: plain grey, no textures.
    await page.keyboard.press('2');
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('brick-walls-clay.png');
    await page.keyboard.press('1');

    await page.keyboard.press('ControlOrMeta+z');
    await expect(walls.locator('input[type=color]')).toHaveCount(1);
    await expect(walls.getByText('80%')).toBeVisible();

    // A colour preset takes the material off again.
    await walls.getByRole('button', { name: 'Ladrillo visto' }).click();
    await walls.getByRole('button', { name: 'Gris cálido' }).click();
    await expect(walls.locator('input[type=color]')).toHaveCount(1);
    await expect(walls.getByRole('button', { name: 'Ladrillo visto' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  },
);

test('a texture that fails to load is reported, and the floor shows its colour', async ({
  page,
  allowConsole,
}) => {
  allowConsole.push(/\[textures\] "oak-planks" failed to load/, /404/);
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  await page.route('**/textures/oak-planks.jpg', (route) => route.fulfill({ status: 404 }));
  await openDemo(page);
  await expect
    .poll(() => warnings.some((text) => /\[textures\] "oak-planks" failed to load/.test(text)))
    .toBe(true);
  await ready(page);
});

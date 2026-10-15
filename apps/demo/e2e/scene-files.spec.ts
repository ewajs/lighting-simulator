import type { SceneFile } from '@luxstudio/core';
import { expect, ready, test, type Page } from './fixtures';

// Saving the scene to a .luxstudio.json file and opening one (ADR 0051).
// Saved files are read in the page and files to open are made there, so the
// suite needs no Node APIs.

/** A small committed scene: a 4 × 3 m office with two downlights and a desk. */
const SMALL_OFFICE = new URL('./files/small-office.luxstudio.json', import.meta.url).pathname;

/** The page keeps the last file it saved, read with `lastSaved`. */
type SavingWindow = Window & { lastSaved?: Blob };

async function openDemo(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object: Blob | MediaSource) => {
      if (object instanceof Blob) (window as SavingWindow).lastSaved = object;
      return create(object);
    };
  });
  await page.goto('/');
  await ready(page);
}

const luminaireCount = (page: Page) => page.getByText(/^Luminarias: \d+$/);
const notice = (page: Page) => page.locator('lxs-notice .notice');

/** Saves with the top bar button and returns the file's name and text. */
async function save(page: Page): Promise<{ name: string; text: string }> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Guardar' }).click();
  const name = (await download).suggestedFilename();
  const text = await page.evaluate(() => (window as SavingWindow).lastSaved!.text());
  return { name, text };
}

/** Drops a file with this name and text onto the viewport. */
async function drop(page: Page, name: string, text: string): Promise<void> {
  const dataTransfer = await page.evaluateHandle(
    ([fileName, contents]) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([contents], fileName, { type: 'application/json' }));
      return transfer;
    },
    [name, text] as const,
  );
  const canvas = page.locator('lxs-viewport .canvas');
  await canvas.dispatchEvent('dragover', { dataTransfer });
  await canvas.dispatchEvent('drop', { dataTransfer });
}

test('saving downloads the scene as a .luxstudio.json file', async ({ page }) => {
  await openDemo(page);
  const { name, text } = await save(page);
  expect(name).toMatch(/^escena-\d{4}-\d{2}-\d{2}-\d{4}\.luxstudio\.json$/);
  const file = JSON.parse(text) as SceneFile;
  expect(file).toMatchObject({ format: 'lux-studio-scene', version: 1 });
  expect(file.scene.luminaires).toHaveLength(5);
  expect(file.scene.furniture).toHaveLength(7);
  expect(file.scene.room.surfaces.floor.texture).toBe('oak-planks');

  // ⌘S does the same.
  const download = page.waitForEvent('download');
  await page.keyboard.press('ControlOrMeta+s');
  expect((await download).suggestedFilename()).toMatch(/\.luxstudio\.json$/);
});

test('Open replaces the scene with the file’s, as one undo step', async ({ page }) => {
  await openDemo(page);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Abrir…' }).click();
  await (await chooser).setFiles(SMALL_OFFICE);
  await expect(luminaireCount(page)).toHaveText('Luminarias: 2');
  await expect(notice(page)).toHaveText('Se abrió small-office.luxstudio.json.');
  await expect(page.locator('.stage')).toHaveScreenshot('small-office.png');

  await page.keyboard.press('ControlOrMeta+z');
  await expect(luminaireCount(page)).toHaveText('Luminarias: 5');
});

test('a saved scene reopens as it was, also dropped on the viewport', async ({ page }) => {
  await openDemo(page);
  const { name, text } = await save(page);
  await page.mouse.click(640, 700); // Empty floor: nothing selected.
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await expect(luminaireCount(page)).toHaveText('Luminarias: 0');

  await drop(page, name, text);
  await expect(luminaireCount(page)).toHaveText('Luminarias: 5');
  expect((await save(page)).text).toBe(text);
});

test('a file that isn’t a valid scene is reported and changes nothing', async ({
  page,
  allowConsole,
}) => {
  allowConsole.push(/\[ui\] Couldn't open/);
  await openDemo(page);
  await drop(page, 'notes.json', '{"name": "my notes"}');
  await expect(notice(page)).toHaveText('notes.json no es un archivo de escena.');
  await expect(notice(page)).toHaveAttribute('data-kind', 'error');

  const { text } = await save(page);
  await drop(page, 'damaged.luxstudio.json', text.replace('"dimming": 1', '"dimming": "full"'));
  await expect(notice(page)).toHaveText('damaged.luxstudio.json está dañado y no se puede abrir.');
  await drop(page, 'future.luxstudio.json', text.replace('"version": 1', '"version": 9'));
  await expect(notice(page)).toContainText(
    'future.luxstudio.json se guardó con una versión más nueva',
  );
  await expect(luminaireCount(page)).toHaveText('Luminarias: 5');
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeDisabled();
});

test('luminaires whose products the catalog lacks are kept, with a notice', async ({
  page,
  allowConsole,
}) => {
  allowConsole.push(/uses products the catalog doesn't have: acme-spot/);
  await openDemo(page);
  const { text } = await save(page);
  const file = JSON.parse(text) as SceneFile;
  const [first, second, ...rest] = file.scene.luminaires;
  const luminaires = [first!, second!].map((l) => ({ ...l, productId: 'acme-spot' }));
  const other = { ...file, scene: { ...file.scene, luminaires: [...luminaires, ...rest] } };
  await drop(page, 'other.luxstudio.json', JSON.stringify(other));
  await expect(notice(page)).toContainText(
    '2 luminarias usan productos que este catálogo no tiene',
  );
  await expect(luminaireCount(page)).toHaveText('Luminarias: 5');

  // Saving again keeps them.
  const again = JSON.parse((await save(page)).text) as SceneFile;
  expect(again.scene.luminaires.filter((l) => l.productId === 'acme-spot')).toHaveLength(2);
});

test('on a phone, Save and Open are in the ⋯ menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  await page.getByRole('button', { name: 'Más opciones' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Guardar' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.luxstudio\.json$/);

  await page.getByRole('button', { name: 'Más opciones' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: 'Abrir…' }).click();
  await (await chooser).setFiles(SMALL_OFFICE);
  await expect(notice(page)).toHaveText('Se abrió small-office.luxstudio.json.');
});

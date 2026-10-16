import { expect, ready, test, type Page } from './fixtures';

/**
 * Hands the import's file input a file, as if the visitor picked it. The
 * content is either text or the URL of a file the demo serves.
 */
async function chooseFile(page: Page, name: string, source: { text: string } | { url: string }) {
  await page.locator('lxs-ies-import input[type="file"]').evaluate(
    async (input: HTMLInputElement, { name, source }) => {
      const content = 'url' in source ? await (await fetch(source.url)).blob() : source.text;
      const transfer = new DataTransfer();
      transfer.items.add(new File([content], name));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change'));
    },
    { name, source },
  );
}

async function openDemo(page: Page): Promise<string[]> {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || /photometry/i.test(message.text())) {
      problems.push(message.text());
    }
  });
  await page.goto('/');
  await ready(page);
  return problems;
}

test(
  'a visitor loads their own IES file, adjusts it and places it',
  { tag: '@all-browsers' },
  async ({ page }) => {
    const problems = await openDemo(page);
    // A real manufacturer file from the demo.
    await chooseFile(page, 'qg63_b35q.ies', { url: '/ies/qg63_b35q.ies' });

    // Prefilled from the file: [LUMINAIRE], downward light → recessed, "3000K" in the text.
    const name = page.getByRole('textbox', { name: 'Nombre' });
    await expect(name).toHaveValue(/^Palco: Medium body spotlight/);
    await expect(page.getByText('Archivo: qg63_b35q.ies')).toBeVisible();
    const mount = page.locator('lxs-ies-import select');
    await expect(mount).toHaveValue('recessed');
    await expect(page.locator('lxs-ies-import lxs-number-field input')).toHaveValue('3000');
    await expect(page.locator('lxs-ies-import')).toHaveScreenshot('ies-import-form.png');

    await name.fill('Mi spot');
    await mount.selectOption('track');
    await page.getByRole('button', { name: 'Agregar al catálogo' }).click();

    await expect(page.getByRole('button', { name: 'Tus archivos IES' })).toBeVisible();
    await page.getByRole('button', { name: /Mi spot/ }).click();
    await expect(page.getByText('Luminarias: 6')).toBeVisible();
    await expect(page.getByText('Mi spot 1', { exact: true })).toBeVisible();
    // Flux and power come from the file (2913 lm, 40.2 W); the mount from the form.
    const inspector = page.locator('lxs-luminaire-inspector');
    await expect(inspector.getByText('De riel', { exact: true })).toBeVisible();
    await expect(inspector).toContainText('2.913 lm');
    await expect(inspector).toContainText('40,2 W');
    await expect(page.locator('lxs-viewport')).toHaveScreenshot('ies-imported-placed.png');
    expect(problems).toEqual([]);
  },
);

test('a file that isn’t IES shows why', async ({ page }) => {
  await openDemo(page);
  await chooseFile(page, 'notes.ies', { text: 'These are not photometric data.' });
  await expect(page.getByRole('alert')).toHaveText(
    'No se pudo leer notes.ies. Invalid IES file: no TILT= line found; is this an IES LM-63 file?',
  );
  await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveCount(0);
});

test('an IES file can be dropped onto the catalog', async ({ page }) => {
  await openDemo(page);
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    const text =
      'IESNA:LM-63-2002\n[LUMCAT] DROP-1\nTILT=NONE\n1 -1 1 2 1 1 2 0 0 0\n1 1 9\n0 90\n0\n500 0\n';
    transfer.items.add(new File([text], 'dropped.ies'));
    return transfer;
  });
  const zone = page.locator('lxs-ies-import .drop');
  await zone.dispatchEvent('dragover', { dataTransfer });
  await zone.dispatchEvent('drop', { dataTransfer });
  // No [LUMINAIRE], so the catalogue number names it.
  await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveValue('DROP-1');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveCount(0);
});

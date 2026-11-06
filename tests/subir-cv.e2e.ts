import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from './utils/fixtures';
import { waitForHydration } from './utils/hydration';
import { expect } from 'e2e';

const BIG_PDF = '.e2e/tmp/cv-grande.pdf';

test.describe('subir CV', { tags: ['smoke'] }, () => {
  test.beforeAll(() => {
    mkdirSync(resolve('.e2e/tmp'), { recursive: true });
    const pdf = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.alloc(5 * 1024 * 1024 + 32, 0x20),
    ]);
    writeFileSync(BIG_PDF, pdf);
  });

  test('valida el tipo y el tamaño del archivo', async ({ app, screen, browser }) => {
    await app.open('/subir-cv');
    await waitForHydration(browser);

    const upload = screen.getByLabel('Archivo del CV');
    const submit = screen.getByRole('button', 'Subir');

    await expect(screen.getByRole('heading', 'Subir Curriculum')).toBeVisible();
    await expect(submit).toBeDisabled();

    await upload.setInputFiles('tests/fixtures/notas.txt');
    await expect(submit).toBeEnabled();
    await submit.tap();
    await expect(screen.getByRole('alert')).toContainText('Solo se aceptan archivos PDF');

    await upload.setInputFiles(BIG_PDF);
    await submit.tap();
    await expect(screen.getByRole('alert')).toContainText('El archivo supera el máximo de 5 MB');
  });

  test('muestra la confirmación cuando la API guarda el perfil', async ({
    app,
    screen,
    browser,
  }) => {
    await browser.route('**/api/cv', (route) =>
      route.fulfill({
        status: 200,
        json: { success: true, id: 'perfil-e2e', totalPages: 2 },
      }),
    );

    await app.open('/subir-cv');
    await waitForHydration(browser);
    await screen.getByLabel('Archivo del CV').setInputFiles('tests/fixtures/cv.pdf');
    await screen.getByRole('button', 'Subir').tap();

    await expect(screen.getByRole('alert')).toContainText('¡Perfil guardado correctamente!');
  });
});

test.describe('subir CV (modelo real)', { tags: ['live'] }, () => {
  test('extrae y guarda un PDF real', { timeout: 300_000 }, async ({ app, screen, browser }) => {
    await app.open('/subir-cv');
    await waitForHydration(browser);
    await screen.getByLabel('Archivo del CV').setInputFiles('tests/fixtures/cv.pdf');
    await screen.getByRole('button', 'Subir').tap();

    await expect(screen.getByRole('alert')).toContainText('¡Perfil guardado correctamente!', {
      timeout: 240_000,
    });
  });

  test('rechaza un PDF ilegible', { timeout: 120_000 }, async ({ app, screen, browser }) => {
    await app.open('/subir-cv');
    await waitForHydration(browser);
    await screen.getByLabel('Archivo del CV').setInputFiles('tests/fixtures/corrupto.pdf');
    await screen.getByRole('button', 'Subir').tap();

    await expect(screen.getByRole('alert')).toContainText(
      'No se pudo leer el PDF (corrupto o encriptado)',
      { timeout: 90_000 },
    );
  });
});

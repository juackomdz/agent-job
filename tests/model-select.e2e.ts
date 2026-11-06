import { test } from './utils/fixtures';
import { waitForHydration } from './utils/hydration';
import { expect } from 'e2e';

const ModelsResponseSchema = {
  models: [] as { id: string; provider: string; model: string }[],
};

test.describe('selector de modelo', { tags: ['smoke'] }, () => {
  test('filtra, elige con teclado y guarda el modelo en la cookie', async ({
    app,
    screen,
    browser,
  }) => {
    await app.open('/chat');
    await waitForHydration(browser);

    const catalog = (await (
      await fetch(`${app.baseUrl}/api/models`)
    ).json()) as typeof ModelsResponseSchema;
    if (!catalog.models.length) test.skip('no hay modelos de lenguaje configurados');

    const combo = screen.getByRole('combobox', 'Modelo');
    await expect(combo).toBeVisible();
    await combo.tap();
    await expect(screen.getByRole('listbox')).toBeVisible();

    const firstOption = screen.getByRole('option').first();
    const optionText = (await firstOption.textContent()).replace('✓', '').trim();
    await combo.fill(optionText.slice(0, Math.min(4, optionText.length)));
    await expect(screen.getByRole('listbox')).toBeVisible();

    await combo.press('Enter');
    await expect(screen.getByRole('listbox')).toBeHidden();
    await expect(combo).toHaveValue(new RegExp(optionText));

    const cookie = (await browser.cookies()).find((item) => item.name === 'ai-model');
    expect(cookie?.value).toBeTruthy();

    await browser.reload();
    await expect(combo).toBeVisible();
    expect(await combo.inputValue()).toContain(optionText);
  });

  test('muestra "Sin resultados" y cierra con Escape', async ({ app, screen, browser }) => {
    await app.open('/chat');
    await waitForHydration(browser);

    const catalog = (await (
      await fetch(`${app.baseUrl}/api/models`)
    ).json()) as typeof ModelsResponseSchema;
    if (!catalog.models.length) test.skip('no hay modelos de lenguaje configurados');

    const combo = screen.getByRole('combobox', 'Modelo');
    await combo.tap();
    await combo.fill('modelo-que-no-existe');

    await expect(screen.getByText('Sin resultados')).toBeVisible();

    await combo.press('Escape');
    await expect(screen.getByRole('listbox')).toBeHidden();
  });
});

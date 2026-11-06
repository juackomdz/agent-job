import { test } from './utils/fixtures';
import { waitForHydration } from './utils/hydration';
import { expect } from 'e2e';

test.describe('chat', { tags: ['smoke'] }, () => {
  test('el compositor solo permite enviar con texto', async ({ app, screen, browser }) => {
    await app.open('/chat');
    await waitForHydration(browser);

    await expect(screen.getByRole('heading', 'Chat')).toBeVisible();

    const input = screen.getByPlaceholder('Escribe un mensaje…');
    const send = screen.getByRole('button', 'Enviar');

    await expect(send).toBeDisabled();
    await input.fill('   ');
    await expect(send).toBeDisabled();
    await input.fill('hola');
    await expect(send).toBeEnabled();
  });
});

test.describe('chat (modelo real)', { tags: ['live'] }, () => {
  test(
    'responde un mensaje del usuario',
    { timeout: 180_000 },
    async ({ app, screen, browser }) => {
      await app.open('/chat');
      await waitForHydration(browser);

      await screen.getByPlaceholder('Escribe un mensaje…').fill('hola');
      await screen.getByRole('button', 'Enviar').tap();

      await expect(screen.getByTestId('msg-user')).toHaveText('hola');

      const reply = screen.getByTestId('msg-assistant');
      await expect(reply).toBeVisible({ timeout: 120_000 });
      await expect(reply).not.toHaveText('…', { timeout: 120_000 });
    },
  );

  test(
    'usa los datos del CV guardado',
    { timeout: 180_000 },
    async ({ app, screen, browser, db }) => {
      db.seedCv({ skills: ['TypeScript', 'Kotlin'] });

      await app.open('/chat');
      await waitForHydration(browser);
      await screen.getByPlaceholder('Escribe un mensaje…').fill('¿Qué skills tengo en mi CV?');
      await screen.getByRole('button', 'Enviar').tap();

      const reply = screen.getByTestId('msg-assistant');
      await expect(reply).toContainText('typescript', { ignoreCase: true, timeout: 120_000 });
    },
  );
});

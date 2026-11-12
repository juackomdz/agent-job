import { test } from './utils/fixtures';
import { waitForHydration } from './utils/hydration';
import { expect } from 'e2e';

test.describe('navegación', { tags: ['smoke'] }, () => {
  test('el sidebar lleva a cada sección', async ({ app, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Panel')).toBeVisible();

    await screen.getByRole('link', 'Chat').tap();
    await expect(browser).toHaveURL('/chat');
    await expect(screen.getByRole('heading', 'Chat')).toBeVisible();

    await screen.getByRole('link', 'Subir CV').tap();
    await expect(browser).toHaveURL('/subir-cv');
    await expect(screen.getByRole('heading', 'Subir Curriculum')).toBeVisible();

    await screen.getByRole('link', 'Todas tus ofertas').tap();
    await expect(browser).toHaveURL('/ofertas');
    await expect(screen.getByRole('heading', 'Todas las ofertas')).toBeVisible();

    await screen.getByRole('link', 'Panel').tap();
    await expect(browser).toHaveURL('/');
    await expect(screen.getByRole('heading', 'Panel')).toBeVisible();
  });

  test('el menú móvil abre el sidebar', async ({ app, screen, browser }) => {
    await browser.setViewport({ width: 390, height: 844 });
    await app.open('/');
    await waitForHydration(browser);

    await screen.getByText('Menú').tap();
    await screen.getByRole('link', 'Chat').tap();

    await expect(browser).toHaveURL('/chat');
    await expect(screen.getByRole('heading', 'Chat')).toBeVisible();
  });
});

import { test } from './utils/fixtures';
import { waitForHydration } from './utils/hydration';
import { expect } from 'e2e';

test.describe('ofertas', { tags: ['smoke'] }, () => {
  test('pagina las ofertas de 10 en 10, ordenadas por match', async ({
    app,
    screen,
    browser,
    db,
  }) => {
    db.seedOffers(
      Array.from({ length: 25 }, (_, index) => ({
        title: `Oferta ${index + 1}`,
        company: 'Empresa de prueba',
        match: index + 1,
      })),
    );

    await app.open('/ofertas');
    await waitForHydration(browser);

    await expect(screen.getByRole('heading', 'Todas las ofertas')).toBeVisible();
    await expect(screen.getByRole('row')).toHaveCount(11); // cabecera + 10

    const firstRow = screen.getByRole('row').nth(1);
    await expect(firstRow).toContainText('Oferta 25');
    await expect(firstRow).toContainText('25%');

    const first = screen.getByRole('button', 'Primera página');
    const previous = screen.getByRole('button', 'Página anterior');
    const next = screen.getByRole('button', 'Página siguiente');
    const last = screen.getByRole('button', 'Última página');

    await expect(first).toBeDisabled();
    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    await expect(last).toBeEnabled();

    await next.tap();
    await expect(screen.getByRole('row')).toHaveCount(11);
    await expect(screen.getByRole('row').nth(1)).toContainText('Oferta 15');
    await expect(first).toBeEnabled();
    await expect(previous).toBeEnabled();

    await last.tap();
    await expect(screen.getByRole('row')).toHaveCount(6); // cabecera + 5
    await expect(screen.getByRole('row').nth(1)).toContainText('Oferta 5');
    await expect(next).toBeDisabled();
    await expect(last).toBeDisabled();

    await first.tap();
    await expect(screen.getByRole('row').nth(1)).toContainText('Oferta 25');
  });

  test('los links de cada oferta abren en una pestaña nueva', async ({ app, screen, db }) => {
    db.seedOffers([
      { title: 'Backend Go', company: 'Andes', match: 90, url: 'https://ofertas.test/go' },
      { title: 'Frontend Vue', company: 'Pacífico', match: 70, url: 'https://ofertas.test/vue' },
    ]);

    await app.open('/ofertas');

    const links = screen.getByRole('link', 'Abrir');
    await expect(links).toHaveCount(2);

    const firstLink = links.first();
    await expect(firstLink).toHaveAttribute('target', '_blank');
    await expect(firstLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(await firstLink.getAttribute('href')).toMatch(/^https:\/\/ofertas\.test\//);
  });
});

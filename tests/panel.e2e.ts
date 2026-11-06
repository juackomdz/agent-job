import { test } from './utils/fixtures';
import { expect } from 'e2e';

test.describe('panel', { tags: ['smoke'] }, () => {
  test('muestra el estado vacío', async ({ app, screen }) => {
    await app.open('/');

    await expect(
      screen.getByText('Sin ofertas. Pide en el chat que busque empleos.'),
    ).toBeVisible();
    await expect(screen.getByTestId('stat-total')).toHaveText('0');
    await expect(screen.getByTestId('stat-avg')).toHaveText('0%');
    await expect(screen.getByTestId('stat-top')).toHaveText('0%');
  });

  test('resume las ofertas guardadas', async ({ app, screen, db }) => {
    db.seedOffers([
      { title: 'Backend Go', company: 'Andes', match: 90 },
      { title: 'Frontend Vue', company: 'Pacífico', match: 70 },
      { title: 'Soporte TI', company: 'Sur', match: null },
    ]);

    await app.open('/');

    await expect(screen.getByTestId('stat-total')).toHaveText('3');
    await expect(screen.getByTestId('stat-avg')).toHaveText('80%');
    await expect(screen.getByTestId('stat-top')).toHaveText('90%');

    await expect(screen.getByRole('table', 'Ofertas de trabajo')).toBeVisible();
    await expect(screen.getByRole('row')).toHaveCount(4); // cabecera + 3 ofertas

    const firstRow = screen.getByRole('row').nth(1);
    await expect(firstRow).toContainText('Backend Go');
    await expect(firstRow).toContainText('90%');
  });
});

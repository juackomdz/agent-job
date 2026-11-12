/**
 * `test` con la fixture `db`: cada test arranca con las tablas limpias y puede
 * sembrar ofertas o un CV sin tocar la base de desarrollo.
 */
import { test as base } from '@e2e-dev/web';
import { createTestDb, type TestDb } from './test-db';

export const test = base.extend<{ db: TestDb }>({
  db: async (_fixtures, use) => {
    const db = createTestDb();
    db.reset();
    try {
      await use(db);
    } finally {
      db.close();
    }
  },
});

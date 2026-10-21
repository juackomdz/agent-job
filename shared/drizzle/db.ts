import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

function createDb() {
  mkdirSync(dirname(process.env.DB_FILE_NAME!), { recursive: true });

  const sqlite = new Database(process.env.DB_FILE_NAME! || './agent-job.db');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle({ client: sqlite });
}

let db: ReturnType<typeof createDb> | undefined;
export const useDb = () => (db ??= createDb());

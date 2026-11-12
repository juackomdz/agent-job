/**
 * Base de datos aislada para las pruebas e2e.
 *
 * La app arranca con `DB_FILE_NAME=.e2e/test.db` (ver `e2e.config.ts`), así que
 * los tests pueden sembrar y limpiar datos sin tocar la base de desarrollo.
 * El esquema se crea antes de levantar Nuxt porque `server/ai/utils/tools.ts`
 * abre la base al importarse.
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

export const TEST_DB_PATH = resolve(process.cwd(), '.e2e/test.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cv_profiles (
  id text PRIMARY KEY,
  created_at integer NOT NULL,
  full_name text,
  email text,
  headline text,
  location text,
  data text NOT NULL
);
CREATE TABLE IF NOT EXISTS cv_skills (
  id text,
  profile_id text NOT NULL,
  skill text NOT NULL,
  CONSTRAINT cv_skills_pk PRIMARY KEY(profile_id, skill),
  CONSTRAINT fk_cv_skills_profile_id_cv_profiles_id_fk FOREIGN KEY (profile_id)
    REFERENCES cv_profiles(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS offers (
  id integer PRIMARY KEY AUTOINCREMENT,
  title text(100) NOT NULL,
  description text NOT NULL,
  company text NOT NULL,
  match integer,
  url text NOT NULL UNIQUE,
  created_at integer NOT NULL
);
CREATE INDEX IF NOT EXISTS cv_skills_skill_idx ON cv_skills (skill);
`;

function openConnection() {
  mkdirSync(dirname(TEST_DB_PATH), { recursive: true });
  const sqlite = new Database(TEST_DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return sqlite;
}

/** Crea el esquema si falta. Es idempotente y corre antes de iniciar la app. */
export function ensureTestSchema() {
  const sqlite = openConnection();
  try {
    sqlite.exec(SCHEMA);
  } finally {
    sqlite.close();
  }
}

export interface SeedOffer {
  title: string;
  company: string;
  match: number | null;
  url?: string;
  description?: string;
}

export interface SeedCv {
  fullName?: string | null;
  email?: string | null;
  headline?: string | null;
  location?: string | null;
  skills?: string[];
}

export interface TestDb {
  reset(): void;
  seedOffers(offers: SeedOffer[]): void;
  seedCv(profile?: SeedCv): string;
  close(): void;
}

export function createTestDb(): TestDb {
  const sqlite = openConnection();
  let cvSeed = 0;

  return {
    reset() {
      sqlite.exec(`
        DELETE FROM cv_skills;
        DELETE FROM cv_profiles;
        DELETE FROM offers;
        DELETE FROM sqlite_sequence WHERE name = 'offers';
      `);
    },

    seedOffers(offers) {
      const insert = sqlite.prepare(`
        INSERT INTO offers (title, description, company, match, url, created_at)
        VALUES (@title, @description, @company, @match, @url, @createdAt)
      `);
      const createdAt = Math.floor(Date.now() / 1000);

      const insertAll = sqlite.transaction((rows: SeedOffer[]) => {
        for (const [index, offer] of rows.entries()) {
          insert.run({
            title: offer.title,
            description: offer.description ?? `Descripción de ${offer.title}`,
            company: offer.company,
            match: offer.match,
            url: offer.url ?? `https://ofertas.test/${createdAt}-${index}`,
            createdAt,
          });
        }
      });

      insertAll(offers);
    },

    seedCv(profile = {}) {
      cvSeed += 1;
      const id = randomUUID();
      const data = {
        fullName: profile.fullName ?? 'Ada Lovelace',
        email: profile.email ?? 'ada@example.test',
        phone: null,
        location: profile.location ?? 'Santiago, Chile',
        headline: profile.headline ?? 'Desarrolladora Full Stack',
        summary: 'Perfil de prueba para la suite e2e.',
        links: [],
        skills: profile.skills ?? ['TypeScript', 'Vue', 'Node.js'],
        experience: [],
        education: [],
        languages: [],
        certifications: [],
      };
      const skills = [...new Set(data.skills.map((skill) => skill.trim().toLowerCase()))].filter(
        Boolean,
      );

      const insertProfile = sqlite.prepare(`
        INSERT INTO cv_profiles (id, created_at, full_name, email, headline, location, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const insertSkill = sqlite.prepare(
        'INSERT INTO cv_skills (id, profile_id, skill) VALUES (?, ?, ?)',
      );

      const insertAll = sqlite.transaction(() => {
        insertProfile.run(
          id,
          Math.floor(Date.now() / 1000) + cvSeed,
          data.fullName,
          data.email,
          data.headline,
          data.location,
          JSON.stringify(data),
        );
        for (const skill of skills) insertSkill.run(randomUUID(), id, skill);
      });

      insertAll();
      return id;
    },

    close() {
      sqlite.close();
    },
  };
}

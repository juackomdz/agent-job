import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const offerTable = sqliteTable('offers', {
  id: int().primaryKey({ autoIncrement: true }),
  title: text({ length: 100 }).notNull(),
  description: text().notNull(),
  company: text().notNull(),
  match: int(),
  url: text().notNull().unique()
});

export const profileTable = sqliteTable('profile', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull(),
  phone: text({ length: 12 }),
});

export const skillsTable = sqliteTable('skills', {
  id: int().primaryKey({ autoIncrement: true }),
  type: text().notNull(),
  value: text().notNull(),
  profileId: int('profile_id').references(() => profileTable.id),
});

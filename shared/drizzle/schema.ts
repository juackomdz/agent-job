import { int, sqliteTable, text, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { type CvProfile } from '#shared/cvSchema'

export const offerTable = sqliteTable('offers', {
  id: int().primaryKey({ autoIncrement: true }),
  title: text({ length: 100 }).notNull(),
  description: text().notNull(),
  company: text().notNull(),
  match: int(),
  url: text().notNull().unique(),
});

export const cvProfiles = sqliteTable('cv_profiles', {
  id: text('id').primaryKey(),
  createdAt: int('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  fullName: text('full_name'),
  email: text('email'),
  headline: text('headline'),
  location: text('location'),
  data: text('data', { mode: 'json' }).$type<CvProfile>().notNull(),
})

export const cvSkills = sqliteTable(
  'cv_skills',
  {
    profileId: text('profile_id')
      .notNull()
      .references(() => cvProfiles.id, { onDelete: 'cascade' }),
    skill: text('skill').notNull(),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.skill] }), index('cv_skills_skill_idx').on(t.skill)],
)

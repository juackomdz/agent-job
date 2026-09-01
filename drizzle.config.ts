import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './drizzle',
  schema: '',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_FILE_NAME!,
  },
});

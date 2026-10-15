import { desc } from 'drizzle-orm';
import { useDb } from '#shared/drizzle/db';
import { offerTable } from '#shared/drizzle/schema';

export default defineEventHandler(async (event) => {
  const limit = Math.min(Number(getQuery(event).limit));
  const db = useDb();
  const rows = await db.select().from(offerTable).orderBy(desc(offerTable.id)).limit(limit);
  return { offers: rows };
});

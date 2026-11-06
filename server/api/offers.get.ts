import { desc } from 'drizzle-orm';
import { useDb } from '#shared/drizzle/db';
import { offerTable } from '#shared/drizzle/schema';

export default defineEventHandler(async (event) => {
  const rawLimit = Number(getQuery(event).limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : undefined;
  const db = useDb();
  const query = db.select().from(offerTable).orderBy(desc(offerTable.id));
  const rows = limit === undefined ? await query : await query.limit(limit);
  return { offers: rows };
});

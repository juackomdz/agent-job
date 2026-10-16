import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';
import { useDb } from '#shared/drizzle/db';
import { CvSchema } from '#shared/cvSchema';
import { getCvProfile, saveCvProfile } from '#shared/drizzle/repository';
import { offerTable } from '#shared/drizzle/schema';

const db = useDb();

export const get_data = toolDefinition({
  name: 'get_cv_data',
  description: 'Muestra los datos del perfil que estan almacenados en la base de datos',
  inputSchema: z.object({}),
}).server(async () => {
  try {
    const profile = await getCvProfile();
    return { profile };
  } catch (error) {
    throw new Error(`error: fallo traer perfil -> ${error}`);
  }
});

export const save_job = toolDefinition({
  name: 'save_job_tool',
  description: 'Guarda las ofertas de trabajo que extrajo inmediatamente luego de buscar.',
  inputSchema: z.object({
    offers: z
      .array(
        z.object({
          title: z.string().min(1).max(100).trim(),
          description: z
            .string()
            .min(1)
            .transform((s) => s.trim().slice(0, 2000)),
          company: z.string().min(1).max(100).trim(),
          match: z
            .number()
            .min(0)
            .max(100)
            .transform((v) => Math.round(v)),
          url: z.string().url().max(500).trim(),
        }),
      )
      .min(1)
      .max(20),
  }),
  outputSchema: z.object({
    count: z.number(),
    offers: z.array(
      z.object({
        id: z.number(),
        title: z.string(),
        company: z.string(),
        match: z.number().nullable(),
        url: z.string(),
      }),
    ),
  }),
}).server(async ({ offers }) => {
  if (!offers || offers.length === 0) {
    throw new Error('save_job falló: offers viene vacío');
  }
  try {
    const rows = offers.map((o) => ({
      title: o.title.trim().slice(0, 100),
      description: o.description.trim().slice(0, 2000),
      company: o.company.trim().slice(0, 100),
      match: Math.round(o.match),
      url: o.url.trim(),
    }));
    const saved = await db
      .insert(offerTable)
      .values(rows)
      .onConflictDoNothing({ target: offerTable.url })
      .returning({
        id: offerTable.id,
        title: offerTable.title,
        company: offerTable.company,
        match: offerTable.match,
        url: offerTable.url,
      });
    return {
      count: saved.length,
      offers: saved,
    };
  } catch (error) {
    throw new Error(`save_job falló: ${error instanceof Error ? error.message : String(error)}`);
  }
});

export const save_profile = toolDefinition({
  name: 'save_profile',
  description:
    'Guarda los datos del perfil que recibes. Esto debes hacerlo despues de que el usuario suba su CV.',
  inputSchema: z.object({
    profile: CvSchema,
  }),
}).server(async ({ profile }) => {
  try {
    const id = await saveCvProfile(profile);
    return { id };
  } catch (error) {
    throw new Error(
      `save_profile falló: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

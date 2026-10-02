import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';
import { TavilyApiResponse, TavilyExtractResponse } from '#shared/types';
import { useDb } from '#shared/drizzle/db'
import { CvSchema } from '#shared/cvSchema'
import { getCvProfile, saveCvProfile } from '#shared/drizzle/repository';
import { offerTable } from '#shared/drizzle/schema';

const db = useDb()

export const test_tool = toolDefinition({
  name: 'test',
  description: 'extrae la informacion del clima',
  inputSchema: z.object(),
  outputSchema: z.string(),
}).server(async () => {
  return 'el clima es de 23°';
});

export const getparsedcvDef = toolDefinition({
  name: 'get_cv',
  description:
    'extrae los datos importantes del CV del usuario: contacto, experiencia, skill, educación y guardalos de manera local.',
  inputSchema: z.object({
    data: z.string(),
  }),
  outputSchema: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    education: z.string(),
    experience: z.array(
      z.object({
        job: z.string(),
        years: z.number(),
        company: z.string(),
      }),
    ),
    skills: z.array(z.string()),
  }),
});

export const search_job = toolDefinition({
  name: 'search_tool',
  description: 'Busca en internet ofertas de trabajo en chile.',
  inputSchema: z.object({
    query: z.string().describe('terminos de busqueda'),
    time_range: z.string(),
  }),
  outputSchema: z.object({
    answer: z.string().optional(),
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
        score: z.number().optional(),
      }),
    ),
  }),
}).server(async ({ query, time_range }) => {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      'Content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      search_depth: 'advanced',
      time_range,
    }),
  });

  if (!response.ok) {
    const errorbody = await response.text();
    throw new Error(`error en tavily ${errorbody}`);
  }

  const data = (await response.json()) as TavilyApiResponse;
  return {
    answer: data.answer ?? undefined,
    results: (data.results ?? []).map((r) => ({
      title: r.title,
      content: r.content,
      url: r.url,
      score: r.score,
    })),
  };
});

export const extract_job = toolDefinition({
  name: 'extract_tool',
  description: 'Extrae los datos importantes de las ofertas de trabajo que encuentres',
  inputSchema: z.object({
    urls: z.array(z.string()),
    query: z.string(),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        url: z.string(),
        raw_content: z.string(),
        images: z.array(z.string()).optional(),
        favicon: z.string().optional(),
      }),
    ),
    failed_results: z
      .array(
        z.object({
          url: z.string(),
          error: z.string(),
        }),
      )
      .optional(),
    response_time: z.number(),
    usage: z
      .object({
        credits: z.number(),
      })
      .optional(),
    request_id: z.string(),
  }),
}).server(async ({ query, urls }) => {
  const response = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      'Content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      urls,
      include_usage: false,
      extract_depth: 'advanced',
    }),
  });

  if (!response.ok) {
    const errorbody = await response.text();
    throw new Error(`error en tavily ${errorbody}`);
  }

  const data = (await response.json()) as TavilyExtractResponse;

  return {
    results: (data.results ?? []).map((r) => ({
      url: r.url,
      raw_content: r.raw_content,
      favicon: r.favicon,
      images: r.images ?? [],
    })),
    failed_results: (data.failed_results ?? []).map((f) => ({
      url: f.url,
      error: f.error,
    })),
    response_time: data.response_time,
    usage: {
      credits: data.usage?.credits ?? 0,
    },
    request_id: data.request_id,
  };
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
  description: 'Guarda los datos del perfil que recibes. Esto debes hacerlo despues de que el usuario suba su CV.',
  inputSchema: z.object({
    profile: CvSchema
  })
}).server(async ({ profile }) => {

  try {
    const id = await saveCvProfile(profile)
    return { id }
  } catch (error) {
    throw new Error(`save_profile falló: ${error instanceof Error ? error.message : String(error)}`)
  }
})

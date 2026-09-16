import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';
import { TavilyApiResponse, TavilyExtractResponse } from '#shared/types';

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
    time_range: z.string()
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
    failed_results: z.array(
      z.object({
        url: z.string(),
        error: z.string(),
      }),
    ).optional(),
    response_time: z.number(),
    usage: z.object({
      credits: z.number(),
    }).optional(),
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
      extract_depth: 'advanced'
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
  name: 'save_tool',
  description: 'Guarda los datos de las ofertas que encuentres, como titulo, descripcion, url, etc.',
  inputSchema: z.object({}),
  outputSchema: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      description: z.string(),
      company: z.string(),
      url: z.string()
    })
  )
}).server(async () => {

  return []
})
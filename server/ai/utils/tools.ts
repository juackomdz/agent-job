import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

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

/*
export const parsecv = getparsedcvDef.server(async ({ data }) => {
  return {
    education,
    email,
    experience,
    name,
    phone,
    skills
  }
})
  */

export const test = toolDefinition({
  name: 'test_tool',
  description: 'Busca en internet informacion actual',
  inputSchema: z.object({ query: z.string().describe('terminos de busqueda') }),
  outputSchema: z.object({
    answer: z.string().optional(),
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
        score: z.number(),
      }),
    ),
  }),
});

interface TavilyApiResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}
interface TavilyApiResponse {
  answer?: string;
  results: TavilyApiResult[];
}

export const test_tavily = test.server(async ({ query }) => {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      'Content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
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

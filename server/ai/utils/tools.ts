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

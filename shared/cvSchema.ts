import { z } from 'zod';

const yearMonth = z.string().nullable().describe('Formato YYYY-MM, o null si no aparece');

export const CvSchema = z.object({
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable().describe('Ciudad y país'),
  headline: z.string().nullable().describe('Título profesional actual'),
  summary: z.string().nullable(),
  links: z.array(z.object({ label: z.string(), url: z.string() })),
  skills: z.array(z.string()).describe('Habilidades técnicas y blandas, una por elemento'),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      startDate: yearMonth,
      endDate: yearMonth.describe('null si es el puesto actual'),
      isCurrent: z.boolean(),
      description: z.string().nullable(),
      achievements: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string().nullable(),
      field: z.string().nullable(),
      startDate: yearMonth,
      endDate: yearMonth,
    }),
  ),
  languages: z.array(z.object({ name: z.string(), level: z.string().nullable() })),
  certifications: z.array(z.string()),
});

export type CvProfile = z.infer<typeof CvSchema>;

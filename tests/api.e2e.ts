import { z } from 'zod';
import { test } from './utils/fixtures';
import { expect } from 'e2e';

const OfferSchema = z.object({
  id: z.number(),
  title: z.string(),
  company: z.string(),
  match: z.number().nullable(),
  url: z.string(),
  description: z.string(),
});

const OffersResponseSchema = z.object({ offers: z.array(OfferSchema) });

const ModelsResponseSchema = z.object({
  models: z.array(
    z.object({
      id: z.string(),
      provider: z.enum(['openai', 'anthropic', 'compatible']),
      model: z.string(),
    }),
  ),
  default: z.string().nullable(),
});

test.describe('API', { tags: ['smoke'] }, () => {
  test('GET /api/offers devuelve todas y respeta limit', async ({ app, db }) => {
    db.seedOffers([
      { title: 'Oferta 1', company: 'Uno', match: 10 },
      { title: 'Oferta 2', company: 'Dos', match: 20 },
      { title: 'Oferta 3', company: 'Tres', match: 30 },
    ]);

    const all = await fetch(`${app.baseUrl}/api/offers`);
    expect(all.status).toBe(200);
    const allBody = expect(await all.json()).toMatchSchema(OffersResponseSchema);
    expect(allBody.offers.map((offer) => offer.title)).toEqual([
      'Oferta 3',
      'Oferta 2',
      'Oferta 1',
    ]);

    const limited = await fetch(`${app.baseUrl}/api/offers?limit=2`);
    expect(limited.status).toBe(200);
    const limitedBody = expect(await limited.json()).toMatchSchema(OffersResponseSchema);
    expect(limitedBody.offers).toHaveLength(2);
    expect(limitedBody.offers[0]?.title).toBe('Oferta 3');

    // Un limit inválido no debe romper la consulta (regresión: Math.min(NaN)).
    const invalid = await fetch(`${app.baseUrl}/api/offers?limit=abc`);
    expect(invalid.status).toBe(200);
    const invalidBody = expect(await invalid.json()).toMatchSchema(OffersResponseSchema);
    expect(invalidBody.offers).toHaveLength(3);
  });

  test('GET /api/models no expone credenciales', async ({ app }) => {
    const response = await fetch(`${app.baseUrl}/api/models`);
    expect(response.status).toBe(200);

    const body = expect(await response.json()).toMatchSchema(ModelsResponseSchema);
    expect(body.models.every((model) => !('apiKey' in model))).toBe(true);
    expect(JSON.stringify(body)).not.toContain('apiKey');
  });

  test('POST /api/cv valida el archivo antes de llamar al modelo', async ({ app }) => {
    const empty = await fetch(`${app.baseUrl}/api/cv`, { method: 'POST' });
    expect(empty.status).toBe(400);

    const missingFile = new FormData();
    missingFile.append('otro', 'valor');
    const missing = await fetch(`${app.baseUrl}/api/cv`, {
      method: 'POST',
      body: missingFile,
    });
    expect(missing.status).toBe(400);

    const text = new FormData();
    text.append('file', new Blob(['no soy un pdf'], { type: 'text/plain' }), 'notas.txt');
    const notPdf = await fetch(`${app.baseUrl}/api/cv`, { method: 'POST', body: text });
    expect(notPdf.status).toBe(415);

    const big = new FormData();
    big.append(
      'file',
      new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'application/pdf' }),
      'grande.pdf',
    );
    const tooBig = await fetch(`${app.baseUrl}/api/cv`, { method: 'POST', body: big });
    expect(tooBig.status).toBe(413);
  });
});

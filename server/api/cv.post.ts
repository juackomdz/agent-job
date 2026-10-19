import { extractText } from 'unpdf';
import { chat } from '@tanstack/ai';
import { adapter } from '../ai/utils/adapter';
import { saveCvProfile } from '#shared/drizzle/repository';
import { CvSchema } from '#shared/cvSchema';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default defineEventHandler(async (event) => {

  const { model } = useRuntimeConfig()

  const formData = await readMultipartFormData(event);

  if (!formData) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Suba un archivo',
    });
  }

  const file = formData.find((f) => f.name === 'file');

  if (!file || !file.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Error en el archivo',
    });
  }

  const isPdf = file.type === 'application/pdf' || file.filename?.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    throw createError({
      statusCode: 415,
      statusMessage: 'Solo se aceptan archivos PDF',
    });
  }

  if (file.data.length > MAX_SIZE_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'El archivo supera el máximo de 5 MB',
    });
  }

  let text: string;
  let totalPages: number;

  try {
    const result = await extractText(new Uint8Array(file.data), { mergePages: true });
    text = result.text;
    totalPages = result.totalPages;
  } catch {
    throw createError({
      statusCode: 422,
      statusMessage: 'No se pudo leer el PDF (corrupto o encriptado)',
    });
  }

  if (!text?.trim()) {
    throw createError({
      statusCode: 422,
      statusMessage: 'No se pudo extraer texto del PDF',
    });
  }

  const profile = await chat({
    stream: false,
    adapter: adapter(model),
    outputSchema: CvSchema,
    messages: [
      {
        role: 'user',
        content: `Extrae el perfil profesional de este CV y devuélvelo como JSON siguiendo el schema:\n\n${text}`,
      },
    ],
  });

  const id = await saveCvProfile(profile);

  return { success: true, id, totalPages };
});

import { openaiCompatible } from '@tanstack/ai-openai/compatible';

const config = useRuntimeConfig();

export const adapter = openaiCompatible({
  baseURL: config.baseUrl,
  apiKey: config.modelApiKey,
  models: [config.model],
});

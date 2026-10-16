import { openaiCompatibleText } from '@tanstack/ai-openai/compatible';

const config = useRuntimeConfig()

export const adapter = openaiCompatibleText('local', {
  baseURL: config.baseUrl,
  apiKey: config.modelApiKey,
});

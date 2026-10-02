import { openaiCompatibleText } from '@tanstack/ai-openai/compatible';

export const adapter = openaiCompatibleText('llama.cpp', {
  baseURL: 'http://localhost:8080/v1',
  apiKey: 'not_api',
});

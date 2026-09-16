import { chat, toServerSentEventsResponse } from '@tanstack/ai';
import { openaiCompatibleText, openaiCompatible } from '@tanstack/ai-openai/compatible';
import { getparsedcvDef, search_job, extract_job } from '../ai/utils/tools';
import { system_prompt } from '../ai/utils/system';

export default defineEventHandler(async (event) => {
  const { messages } = await readBody(event);

  try {
    ///gemini
    /*
    const stream = chat({
      messages,
      adapter: geminiText('gemini-2.5-flash'),
      tools: [test],
    });
*/
    ///local model
    const stream = chat({
      messages,
      adapter: openaiCompatibleText('llama.cpp', {
        baseURL: 'http://localhost:8080/v1',
        apiKey: 'not_api',
      }),
      systemPrompts: [system_prompt],
      tools: [search_job, extract_job],
      middleware: [{
        name: 'token_usage',
        onUsage: (_ctx, usage) => {
          console.log(`input: ${usage.promptTokens}`)
          console.log(`output: ${usage.completionTokens}`)
          console.log(`total de tokens: ${usage.totalTokens}`)
        },
      }]

    });

    return toServerSentEventsResponse(stream);
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `error ${error}`,
    });
  }
});

import { chat, toServerSentEventsResponse, toolDefinition } from '@tanstack/ai';
import { openaiCompatibleText } from '@tanstack/ai-openai/compatible';
import { geminiText } from '@tanstack/ai-gemini';
import { googleSearchTool } from '@tanstack/ai-gemini/tools';
import { webSearchTool } from '@tanstack/ai-openai/tools';
import { getparsedcvDef } from '../ai/utils/tools';
import { system_prompt } from '../ai/utils/system';

export default defineEventHandler(async (event) => {
  const { messages } = await readBody(event);

  try {
    ///gemini
    const stream = chat({
      messages,
      adapter: geminiText('gemini-2.5-flash'),
      tools: [googleSearchTool()],
    });

    ///local model
    /*
    const stream = chat({
      messages,
      adapter: openaiCompatibleText('llama.cpp', {
        baseURL: 'http://localhost:8080/v1',
        apiKey: 'not_api',
      }),
      systemPrompts: [system_prompt],
      tools: [
        webSearchTool({
          type: "web_search_2025_08_26",
        })
      ],
    });
    */
    return toServerSentEventsResponse(stream);
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `error ${error}`,
    });
  }
});

import { chat, toServerSentEventsResponse } from '@tanstack/ai';
import { openaiCompatibleText } from '@tanstack/ai-openai/compatible';

export default defineEventHandler(async (event) => {
  const { messages } = await readBody(event);

  try {
    const stream = chat({
      messages,
      adapter: openaiCompatibleText('qwopus0.8', {
        baseURL: 'http://localhost:8080/v1',
        apiKey: 'not_api',
      }),
    });

    setResponseHeaders(event, {
      'content-type': 'text/event-stream',
      connection: 'keep-alive',
      'cache-control': 'no-cache',
    });
    return toServerSentEventsResponse(stream);
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `error ${error}`,
    });
  }
});

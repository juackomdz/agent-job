import {
  chat,
  toServerSentEventsResponse,
  untilFinishReason,
  combineStrategies,
  maxIterations,
} from '@tanstack/ai';
import { createMCPClient } from '@tanstack/ai-mcp';
import { save_job, get_data } from '../ai/utils/tools';
import { system_prompt } from '../ai/utils/system';
import { resolveAdapter } from '../ai/utils/providers';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const body = await readBody(event);
  const { messages } = body;
  const requestedModel = body?.forwardedProps?.model ?? body?.data?.model;
  const adapter = resolveAdapter(typeof requestedModel === 'string' ? requestedModel : undefined);
  const abortController = new AbortController();

  try {
    const mcp = await createMCPClient({
      name: 'tavily-mcp',
      transport: {
        type: 'http',
        url: `https://mcp.tavily.com/mcp/?tavilyApiKey=${config.tavilyApiKey}`,
      },
    });

    const stream = chat({
      messages,
      adapter,
      systemPrompts: [system_prompt],
      mcp: {
        clients: [mcp],
      },
      tools: [save_job, get_data],
      agentLoopStrategy: combineStrategies([
        maxIterations(10),
        untilFinishReason(['stop', 'length']),
      ]),
      abortController,
      middleware: [],
    });

    return toServerSentEventsResponse(stream, { abortController });
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `error ${error}`,
    });
  }
});

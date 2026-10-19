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
import { adapter } from '../ai/utils/adapter';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const { messages } = await readBody(event);
  const abortController = new AbortController()

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
      adapter: adapter(config.model),
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
      middleware: [
        {
          name: 'token_usage',
          onUsage: (_ctx, usage) => {
            console.log(`input: ${usage.promptTokens}`);
            console.log(`output: ${usage.completionTokens}`);
            console.log(`total de tokens: ${usage.totalTokens}`);
          },
          onError(_ctx, info) {
            console.log(`error: ${info.error}`);
          },
        },
      ],
    });

    return toServerSentEventsResponse(stream, { abortController });
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `error ${error}`,
    });
  }
});

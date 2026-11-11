import {
  chat,
  toServerSentEventsResponse,
  untilFinishReason,
  combineStrategies,
  maxIterations,
  chatParamsFromRequestBody
} from '@tanstack/ai';
import { createMCPClient } from '@tanstack/ai-mcp';
import { withPersistence } from '@tanstack/ai-persistence'
import { save_job, get_data } from '../ai/utils/tools';
import { system_prompt } from '../ai/utils/system';
import { resolveAdapter } from '../ai/utils/providers';
import { persistence } from '../ai/utils/persistence'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const body = await readBody(event);

  let params: Awaited<ReturnType<typeof chatParamsFromRequestBody>>
  try {
    params = await chatParamsFromRequestBody(body)
  } catch (error) {
    if (error) return error
    throw error
  }

  const adapter = await resolveAdapter(
    typeof params.forwardedProps.model === 'string' ? params.forwardedProps.model : undefined,
  );
  const abortController = new AbortController();

  try {

    if (!config.apifyApiKey) {
      throw createError({
        statusCode: 500,
        message: 'Falta NUXT_APIFY_API_KEY',
      });
    }

    const apify = await createMCPClient({
      name: 'apify',
      transport: {
        type: 'http',
        url: 'https://mcp.apify.com?tools=search-actors,fetch-actor-details,call-actor,apify/web-search,apify/web-fetch',
        headers: {
          "Authorization": `Bearer ${config.apifyApiKey}`
        }
      }
    })

    const stream = chat({
      threadId: params.threadId,
      messages: params.messages,
      adapter,
      systemPrompts: [system_prompt],
      mcp: {
        clients: [apify],
      },
      tools: [save_job, get_data],
      agentLoopStrategy: combineStrategies([
        maxIterations(20),
        untilFinishReason(['stop', 'length']),
      ]),
      abortController,
      middleware: [withPersistence(persistence)],
    });

    return toServerSentEventsResponse(stream, { abortController });
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `error ${error}`,
    });
  }
});

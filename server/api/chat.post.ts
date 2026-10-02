import { chat, toServerSentEventsResponse, untilFinishReason, combineStrategies, maxIterations } from '@tanstack/ai';
import { openaiCompatibleText, openaiCompatible } from '@tanstack/ai-openai/compatible';
import { createMCPClient } from '@tanstack/ai-mcp';
import { save_job, save_profile } from '../ai/utils/tools';
import { system_prompt } from '../ai/utils/system';

export default defineEventHandler(async (event) => {
  const { messages } = await readBody(event);

  try {

    const mcp = await createMCPClient({
      name: 'tavily-mcp',
      transport: {
        type: 'http',
        url: `https://mcp.tavily.com/mcp/?tavilyApiKey=${process.env.TAVILY_API_KEY}`,
      },
    });


    const nvidia = openaiCompatible({
      apiKey: process.env.NVIDIA_API!,
      baseURL: 'https://integrate.api.nvidia.com/v1',
      models: [
        'moonshotai/kimi-k3',
        'nvidia/nemotron-3-ultra-550b-a55b',
        'openai/gpt-oss-20b',
        'google/gemma-4-31b-it',
        'nvidia/nemotron-3.5-lightning-30b-a3b',
      ],
    });
    ///local model
    const stream = chat({
      messages,
      adapter: /*gemini('gemma-4-31b-it')*/ /*nvidia('openai/gpt-oss-20b')*/ openaiCompatibleText(
        'llama.cpp',
        {
          baseURL: 'http://localhost:8080/v1',
          apiKey: 'not_api',
        },
      ),
      systemPrompts: [system_prompt],
      mcp: {
        clients: [mcp],
      },
      tools: [save_job, /*save_profile*/],
      agentLoopStrategy: combineStrategies([maxIterations(10), untilFinishReason(['stop', 'length'])]),
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

    return toServerSentEventsResponse(stream);
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `error ${error}`,
    });
  }
});

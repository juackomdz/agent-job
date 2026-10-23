import type { AnyTextAdapter } from '@tanstack/ai';
import { createAnthropicChat, type AnthropicChatModel } from '@tanstack/ai-anthropic';
import { createOpenaiChat, type OpenAIChatModel } from '@tanstack/ai-openai';
import { openaiCompatibleText } from '@tanstack/ai-openai/compatible';
import { toModelId, type ModelOption, type ProviderId } from '#shared/models';

const DEFAULT_OPENAI_MODELS = 'gpt-5-mini';
const DEFAULT_ANTHROPIC_MODELS = 'claude-sonnet-4-5';

function listModels(value: string): string[] {
  return value
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
}

export function getAvailableModels(): ModelOption[] {
  const config = useRuntimeConfig();
  const models: ModelOption[] = [];

  function add(provider: ProviderId, raw: string) {
    for (const model of listModels(raw)) {
      const id = toModelId(provider, model);
      if (!models.some((option) => option.id === id)) models.push({ id, provider, model });
    }
  }

  if (config.openaiApiKey) add('openai', config.openaiModels || DEFAULT_OPENAI_MODELS);
  if (config.anthropicApiKey) add('anthropic', config.anthropicModels || DEFAULT_ANTHROPIC_MODELS);
  if (config.baseUrl && config.modelApiKey) add('compatible', config.model);

  return models;
}

export function getDefaultModelId(models: ModelOption[] = getAvailableModels()): string | null {
  const { defaultModel } = useRuntimeConfig();

  if (defaultModel && models.some((model) => model.id === defaultModel)) return defaultModel;
  return models[0]?.id ?? null;
}

export function resolveAdapter(modelId?: string | null): AnyTextAdapter {
  const config = useRuntimeConfig();
  const models = getAvailableModels();
  const id = modelId?.trim() || getDefaultModelId(models);
  const option = models.find((model) => model.id === id);

  if (!option) {
    throw createError({
      statusCode: 400,
      statusMessage: id ? `Modelo no disponible: ${id}` : 'No hay modelos configurados',
    });
  }

  switch (option.provider) {
    case 'openai':
      return createOpenaiChat(option.model as OpenAIChatModel, config.openaiApiKey);
    case 'anthropic':
      return createAnthropicChat(option.model as AnthropicChatModel, config.anthropicApiKey);
    case 'compatible':
      return openaiCompatibleText(option.model, {
        baseURL: config.baseUrl,
        apiKey: config.modelApiKey,
      });
  }
}

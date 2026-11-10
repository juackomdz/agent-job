import type { AnyTextAdapter } from '@tanstack/ai';
import {
  ANTHROPIC_MODELS,
  createAnthropicChat,
  type AnthropicChatModel,
} from '@tanstack/ai-anthropic';
import {
  OPENAI_CHAT_MODELS,
  createOpenaiChat,
  type OpenAIChatModel,
} from '@tanstack/ai-openai';
import { openaiCompatibleText } from '@tanstack/ai-openai/compatible';
import { toModelId } from '#shared/models';
import type { ModelOption, ProviderId } from '#shared/types'

const NON_CHAT_MODEL =
  /audio|realtime|search|computer-use|deep-research|codex|image|embedding|tts|transcri|moderation/i;

const PROVIDERS: ProviderId[] = ['openai', 'anthropic', 'compatible'];

const PREFERRED_MODELS: Record<ProviderId, string[]> = {
  openai: ['gpt-5-mini', 'gpt-5.1', 'gpt-4.1-mini'],
  anthropic: ['claude-sonnet-4-5', 'claude-haiku-4-5'],
  compatible: [],
};

const COMPATIBLE_CACHE_MS = 10 * 60 * 1000;
const COMPATIBLE_FAILURE_CACHE_MS = 60 * 1000;
const COMPATIBLE_TIMEOUT_MS = 4000;

let compatibleCache: { baseUrl: string; models: string[]; expiresAt: number } | null = null;
let compatibleInflight: Promise<string[]> | null = null;

async function fetchCompatibleModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const now = Date.now();

  if (compatibleCache?.baseUrl === baseUrl && compatibleCache.expiresAt > now) {
    return compatibleCache.models;
  }
  if (compatibleInflight) return compatibleInflight;

  const url = `${baseUrl.replace(/\/+$/, '')}/models`;

  compatibleInflight = (async () => {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(COMPATIBLE_TIMEOUT_MS),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = (await response.json()) as {
        data?: { id?: string }[];
        models?: { name?: string }[];
      };

      const models = [
        ...(payload.data ?? []).map((model) => model.id),
        ...(payload.models ?? []).map((model) => model.name),
      ].filter((model): model is string => Boolean(model));

      if (!models.length) console.warn(`[models] ${url} no devolvió modelos`);

      compatibleCache = {
        baseUrl,
        models,
        expiresAt: now + (models.length ? COMPATIBLE_CACHE_MS : COMPATIBLE_FAILURE_CACHE_MS),
      };

      return models;
    } catch (error) {
      console.warn(`[models] no se pudo leer ${url}:`, error);
      compatibleCache = {
        baseUrl,
        models: [],
        expiresAt: Date.now() + COMPATIBLE_FAILURE_CACHE_MS,
      };
      return [];
    } finally {
      compatibleInflight = null;
    }
  })();

  return compatibleInflight;
}

export async function getAvailableModels(): Promise<ModelOption[]> {
  const config = useRuntimeConfig();
  const models: ModelOption[] = [];

  function add(provider: ProviderId, source: readonly string[]) {
    for (const model of source) {
      const id = toModelId(provider, model);
      if (!models.some((option) => option.id === id)) models.push({ id, provider, model });
    }
  }

  if (config.openaiApiKey) {
    add(
      'openai',
      OPENAI_CHAT_MODELS.filter((model) => !NON_CHAT_MODEL.test(model)),
    );
  }

  if (config.anthropicApiKey) add('anthropic', ANTHROPIC_MODELS);

  if (config.baseUrl && config.modelApiKey) {
    add('compatible', await fetchCompatibleModels(config.baseUrl, config.modelApiKey));
  }

  return models;
}

export function getDefaultModelId(models: ModelOption[]): string | null {
  const { defaultModel } = useRuntimeConfig();

  if (defaultModel && models.some((model) => model.id === defaultModel)) return defaultModel;

  for (const provider of PROVIDERS) {
    const preferred = PREFERRED_MODELS[provider].find((model) =>
      models.some((option) => option.provider === provider && option.model === model),
    );

    if (preferred) return toModelId(provider, preferred);
  }

  return models[0]?.id ?? null;
}

export async function resolveAdapter(modelId?: string | null): Promise<AnyTextAdapter> {
  const config = useRuntimeConfig();
  const models = await getAvailableModels();
  const id = modelId?.trim() || getDefaultModelId(models);
  const option = models.find((model) => model.id === id);

  if (!option) {
    throw createError({
      statusCode: 400,
      statusMessage: models.length
        ? `Modelo no disponible: ${id}`
        : 'No hay modelos disponibles: configura NUXT_OPENAI_API_KEY, NUXT_ANTHROPIC_API_KEY o NUXT_BASE_URL + NUXT_MODEL_API_KEY',
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

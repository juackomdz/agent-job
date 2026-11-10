import type { ProviderId } from '#shared/types'

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  compatible: 'Compatible',
};

export function toModelId(provider: ProviderId, model: string): string {
  return `${provider}:${model}`;
}

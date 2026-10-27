export type ProviderId = 'openai' | 'anthropic' | 'compatible';

export interface ModelOption {
  id: string;
  provider: ProviderId;
  model: string;
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  compatible: 'Compatible',
};

export function toModelId(provider: ProviderId, model: string): string {
  return `${provider}:${model}`;
}

export interface Offer {
  id: number;
  title: string;
  company: string;
  match: number | null;
  url: string;
  description: string;
}

export type ProviderId = 'openai' | 'anthropic' | 'compatible';

export interface ModelOption {
  id: string;
  provider: ProviderId;
  model: string;
}

export interface ModelsResponse {
  models: ModelOption[];
  default: string | null;
}
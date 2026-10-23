import { computed } from 'vue';
import { PROVIDER_LABELS, type ModelOption, type ProviderId } from '#shared/models';

interface ModelsResponse {
  models: ModelOption[];
  default: string | null;
}

export function useModelSelection() {
  const { data } = useFetch<ModelsResponse>('/api/models', { key: 'models' });

  const saved = useCookie<string | null>('ai-model', {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  const models = computed(() => data.value?.models ?? []);

  const selected = computed<string | null>({
    get() {
      const current = saved.value;
      if (current && models.value.some((model) => model.id === current)) return current;

      return data.value?.default ?? models.value[0]?.id ?? null;
    },
    set(value) {
      saved.value = value;
    },
  });

  const groups = computed(() => {
    const grouped = new Map<ProviderId, ModelOption[]>();

    for (const model of models.value) {
      grouped.set(model.provider, [...(grouped.get(model.provider) ?? []), model]);
    }

    return [...grouped].map(([provider, options]) => ({
      provider,
      label: PROVIDER_LABELS[provider],
      options,
    }));
  });

  return { models, groups, selected };
}

import { getAvailableModels, getDefaultModelId } from '../ai/utils/providers';

export default defineEventHandler(() => {
  const models = getAvailableModels();

  return { models, default: getDefaultModelId(models) };
});

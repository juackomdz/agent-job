import { getAvailableModels, getDefaultModelId } from '../ai/utils/providers';

export default defineEventHandler(async () => {
  const models = await getAvailableModels();

  return { models, default: getDefaultModelId(models) };
});

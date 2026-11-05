import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { openaiCompatible } from '@tanstack/ai-openai/compatible'
import { tanstackLanguageModel } from './tests/utils/tanstack-adapter'



const test = openaiCompatible({
  baseURL: 'http://localhost:9931/v1',
  apiKey: 'not_api',
  models: ['tester']
})

const model = tanstackLanguageModel(test('tester'), {
  modelId: 'local',
  provider: 'llama.cpp'
})

export default {
  targets: [{
    engine: web(),
    app: {
      url: process.env.APP_URL ?? 'http://localhost:3000',
      // Or let the runner start the dev server:
      //command: { executable: 'npm', args: ['run', 'dev'] },
    },
  }],
  agents: {
    default: { model }
  }
} satisfies E2EConfig;

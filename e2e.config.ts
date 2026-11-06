import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { openaiCompatible } from '@tanstack/ai-openai/compatible';
import { tanstackLanguageModel } from './tests/utils/tanstack-adapter';
import { ensureTestSchema, TEST_DB_PATH } from './tests/utils/test-db';

// El esquema debe existir antes de que la app abra la base de datos.
ensureTestSchema();

// Servidor OpenAI-compatible del agente e2e. Los tests con tag `live` lo
// necesitan corriendo; los tests deterministas no lo usan.
const modelBaseUrl = process.env.E2E_MODEL_BASE_URL ?? 'http://localhost:9931/v1';
const modelName = process.env.E2E_MODEL_NAME ?? 'tester';
const modelApiKey = process.env.E2E_MODEL_API_KEY ?? 'local';

const test = openaiCompatible({
  baseURL: modelBaseUrl,
  apiKey: 'not_api',
  models: [modelName],
});

const model = tanstackLanguageModel(test(modelName), {
  modelId: 'local',
  provider: 'llama.cpp',
});

export default {
  tests: 'tests/**/*.e2e.ts',
  // La app y las pruebas comparten una única base SQLite: sin paralelismo entre archivos.
  workers: 1,
  targets: [
    {
      engine: web(),
      app: {
        url: 'http://127.0.0.1:0',
        command: {
          executable: 'node',
          args: [
            'node_modules/nuxt/bin/nuxt.mjs',
            'dev',
            '--port',
            '{port}',
            '--host',
            '127.0.0.1',
          ],
          env: {
            E2E_TEST: '1',
            DB_FILE_NAME: TEST_DB_PATH,
            NUXT_BASE_URL: modelBaseUrl,
            NUXT_MODEL_API_KEY: modelApiKey,
            NUXT_DEFAULT_MODEL: `compatible:${modelName}`,
          },
          startupTimeout: 240_000,
          shutdownTimeout: 20_000,
          log: '.e2e/logs/app.log',
        },
      },
    },
  ],
  agents: {
    default: { model },
  },
} satisfies E2EConfig;

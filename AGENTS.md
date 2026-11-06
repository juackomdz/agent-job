# AGENTS.md

## Project

Nuxt 4 (Vue 3 + TypeScript) job-search agent for the Chilean IT market. SSR app in `app/`, Nitro routes in `server/`, code shared by both in `shared/` (alias `#shared/*`). Prompts, tool descriptions and UI copy are in Spanish — keep it that way.

## Commands

- `pnpm dev` — dev server on `http://localhost:3000`
- `pnpm build` → `pnpm start` runs the built server (`node --env-file=.env .output/server/index.mjs`; needs Node ≥ 22 for `--env-file`)
- `pnpm generate` / `pnpm preview` — static build / preview
- `pnpm lint` — oxlint (currently clean, keep it clean)
- `pnpm fmt` / `pnpm fmt:check` — oxfmt, single quotes (`.oxfmtrc.json`). **oxfmt also formats Markdown**, so `pnpm fmt` also rewrites `README.md` / `AGENTS.md`.
- `pnpm test:e2e` — e2e deterministas (excluye el tag `live`); el runner levanta la app y usa su propia BD en `.e2e/test.db` (ver Testing). The only test suite; no unit tests, no typecheck (vue-tsc is not installed).
- `pnpm test:e2e:smoke` / `pnpm test:e2e:live` — solo los tags `smoke` / `live`. Los `live` necesitan el modelo local en `http://localhost:9931/v1` (y chat además `NUXT_TAVILY_API_KEY`).
- `pnpm db:push` / `db:generate` / `db:migrate` / `db:studio` — drizzle-kit (see Database)
- `pnpm install` → runs `nuxt prepare` (postinstall); re-run it after adding deps or modules.
- New native deps must be allowlisted in `allowBuilds` in `pnpm-workspace.yaml`, otherwise pnpm blocks their install scripts.

## Env

`.env` is gitignored and holds secrets — don't read it into the transcript and never commit it. `.env.example` is the template.

| var                      | maps to                         | used by                                                       |
| ------------------------ | ------------------------------- | ------------------------------------------------------------- |
| `DB_FILE_NAME`           | `process.env`                   | SQLite file path (`*.db` is gitignored)                       |
| `NUXT_TAVILY_API_KEY`    | `runtimeConfig.tavilyApiKey`    | Tavily MCP endpoint (required for chat search)                |
| `NUXT_OPENAI_API_KEY`    | `runtimeConfig.openaiApiKey`    | native OpenAI provider (only listed if set)                   |
| `NUXT_ANTHROPIC_API_KEY` | `runtimeConfig.anthropicApiKey` | native Anthropic provider (only listed if set)                |
| `NUXT_BASE_URL`          | `runtimeConfig.baseUrl`         | OpenAI-compatible endpoint (`/models` must be available)      |
| `NUXT_MODEL_API_KEY`     | `runtimeConfig.modelApiKey`     | model auth (any placeholder works for local Ollama/llama.cpp) |
| `NUXT_DEFAULT_MODEL`     | `runtimeConfig.defaultModel`    | preselected model id, e.g. `openai:gpt-5-mini`                |

Model ids are namespaced `proveedor:modelo` and do **not** come from `.env`: they come from `OPENAI_CHAT_MODELS` / `ANTHROPIC_MODELS` in each adapter and from `GET {NUXT_BASE_URL}/models` for the compatible endpoint. That provider only shows up when **both** `NUXT_BASE_URL` and `NUXT_MODEL_API_KEY` are set.

- Nuxt CLI loads `.env` in dev/build and drizzle-kit loads it too (dotenv dep); the built server gets it via `pnpm start`'s `--env-file`.
- `server/ai/utils/providers.ts` reads `useRuntimeConfig()` per call (not at import time), so new credentials show up after restarting the dev server; the UI fetches the catalog from `/api/models`.

## Database (SQLite + drizzle)

- `shared/drizzle/db.ts` — `useDb()` lazy singleton over `better-sqlite3` (WAL, foreign keys on); creates the parent dir of `DB_FILE_NAME` on first use. **`DB_FILE_NAME` unset crashes `useDb()`** (`mkdirSync(dirname(undefined))` throws before the `./agent-job.db` fallback is reached); empty string falls back to `agent-job.db`.
- `server/ai/utils/tools.ts` calls `useDb()` at **module scope** → importing that module opens the DB, so a missing/invalid `DB_FILE_NAME` breaks `/api/chat` at import time, not only when a tool touches the DB.
- `pnpm db:push` applies `shared/drizzle/schema.ts` straight to the DB (asks for confirmation); `pnpm db:generate` writes a migration into `drizzle/` (one is committed) and `pnpm db:migrate` applies pending ones. drizzle-kit reads `process.env.DB_FILE_NAME` directly, not runtimeConfig.
- drizzle-orm is `1.0.0-rc.4` → use the new API (`drizzle({ client })`, `int().primaryKey()`, `text({ length })`, `sqliteTable(name, cols, (t) => [primaryKey(...), index(...)])`). v0 snippets from docs/blogs won't compile.
- `shared/drizzle/repository.ts` — `saveCvProfile()` writes `cv_profiles` plus lowercased/deduped `cv_skills` in one transaction; `getCvProfile()` returns the latest row by `createdAt`.

## Architecture

- `app/` is the Nuxt 4 `srcDir`. Components are auto-imported. `app/app.vue` wraps every route in the `dashboard` layout (sidebar: Panel / Chat / Subir CV / Todas tus ofertas). Tailwind v4 + daisyUI live in `app/assets/css/main.css` (theme `garden` default plus a custom `claro` theme).
- Pages: `index.vue` (dashboard: stats + top offers, SSR `useFetch`), `chat.vue` → `ChatPanel.vue` (SSE chat via `@tanstack/ai-vue` `useChat({ connection: fetchServerSentEvents('/api/chat') })`, model picked with `ModelSelect`), `subir-cv.vue` (PDF upload form), `ofertas.vue` (full table + pagination).
- `app/composables/useOffersTable.ts` owns the TanStack Table v9 setup (sort by `match` desc, pagination); pages just wire `OffersTable` + `Pagination`.
- `server/api/chat.post.ts` — POST `/api/chat` (body `{ messages, forwardedProps?: { model } }`, `data.model` also accepted) → SSE via `toServerSentEventsResponse`; agent loop capped by `maxIterations(10)` + `untilFinishReason(['stop', 'length'])`. The model id (`provider:model` from `/api/models`) is resolved per request by `server/ai/utils/providers.ts` → native OpenAI/Anthropic adapters or an OpenAI-compatible endpoint; unknown ids are 400. Search tools come from the **Tavily MCP server** (`createMCPClient`, http transport `https://mcp.tavily.com/mcp/?tavilyApiKey=…`) — remote MCP tools, not local functions. Wired local tools: `get_cv_data` (read the latest CV profile) and `save_job_tool` (insert into `offers`, unique `url`, `onConflictDoNothing`, `match` 0–100).
- `server/ai/utils/providers.ts` — provider registry. `getAvailableModels()` (async) builds the catalog from the adapters' own model lists (`OPENAI_CHAT_MODELS` minus audio/search/codex/etc., `ANTHROPIC_MODELS`) and from `GET {baseUrl}/models` for the compatible endpoint (in-memory cache: 10 min success / 60 s failure, 4 s timeout; if it fails the provider is hidden, no env fallback). `getDefaultModelId()` honors `NUXT_DEFAULT_MODEL` and otherwise prefers `gpt-5-mini`, then `claude-sonnet-4-5`; `resolveAdapter()` (async) whitelists the id before creating an adapter.
- `server/api/models.get.ts` — GET `/api/models` → `{ models, default }`, never keys. `shared/models.ts` defines the `ProviderId` union and the model-id helpers. The UI stores the picked id in the `ai-model` cookie via `app/composables/useModelSelection.ts` and renders it with `app/components/ModelSelect.vue` (searchable combobox grouped by provider).
- `server/ai/utils/tools.ts` — the zod schemas are the tool contract. `save_profile` is defined but **not passed to `chat()`** → dead code unless you wire it.
- `server/ai/utils/system.ts` — the Spanish system prompt; it is the spec for how the agent must use the tools (search → extract → score → save, only `match >= 60`). Update it whenever tool behaviour changes.
- `server/api/cv.post.ts` — POST `/api/cv`: multipart field name **`file`** (plus optional `model`), PDF only (415 otherwise), ≤ 5 MB (413), unreadable/corrupt PDF 422; text extracted with `unpdf`, structured output validated by `CvSchema` → `saveCvProfile`. Requires a provider that supports structured output.
- `server/api/offers.get.ts` — GET `/api/offers?limit=N` (limit optional) → rows ordered by id desc.
- `shared/cvSchema.ts` — zod `CvSchema` + `CvProfile` type, used by both the CV extraction and the `cv_profiles.data` JSON column. `shared/types.ts` holds the `Offer` type used by the frontend table.

## Testing (agentic e2e)

- `pnpm test:e2e` (`e2e run --exclude-tag live`): tests in `tests/**/*.e2e.ts`, mixing exact locator assertions (`app`, `browser`, `expect`) and, where needed, `agent.*` goals. The only test suite; there are no unit tests.
- **The runner starts the app** (`app.command` in `e2e.config.ts`: Nuxt dev on a free port, host `127.0.0.1`) and passes its own env: `DB_FILE_NAME=.e2e/test.db`, `NUXT_BASE_URL=http://localhost:9931/v1`, `NUXT_MODEL_API_KEY`, `NUXT_DEFAULT_MODEL=compatible:tester`, `E2E_TEST=1` (disables Nuxt DevTools). No need to run `pnpm dev`.
- `workers: 1`: the app and the tests share `.e2e/test.db`. `tests/utils/fixtures.ts` exports the `test` used by the suite (import it from there, not from `@e2e-dev/web`); its `db` fixture resets the DB before every test and exposes `seedOffers()` / `seedCv()`.
- Tags: `smoke` = deterministic, no model; `live` = real app model. `pnpm test:e2e:smoke` runs only `smoke`, `pnpm test:e2e:live` only `live`. Chat tests also need `NUXT_TAVILY_API_KEY` (read from `.env` by Nuxt). The model-select tests skip when `/api/models` returns an empty catalog.
- CI: `.github/workflows/e2e.yml` runs only the `smoke` tag on pull requests and pushes to `main` (Chromium installed with `e2e-web install`; no local model or Tavily needed).
- After `app.open()` call `waitForHydration(browser)` (`tests/utils/hydration.ts`) before interacting with Vue forms. It waits for `window.__APP_READY__`, set by `app/plugins/e2e-ready.client.ts` via `onNuxtReady`.
- `ensureTestSchema()` runs at `e2e.config.ts` load (before the app opens the DB). `nuxt.config.ts` pre-bundles `@lucide/vue`, `@tanstack/ai-vue` and `@tanstack/vue-table` to avoid Vite reloads mid-test.
- Fixtures: `tests/fixtures/cv.pdf` (text extractable with `unpdf`), `corrupto.pdf` and `notas.txt`. The >5 MB PDF is generated at runtime in `.e2e/tmp/`.
- The e2e agent model is TanStack AI wrapped as an AI SDK `LanguageModel` in `tests/utils/tanstack-adapter.ts` (one model call per invocation; e2e owns the tool loop) — adapt it when switching providers.
- Use the repo-local `e2e` skill (`.agents/skills/e2e/`, one reference per topic) and the `e2e` MCP server (`e2e mcp`) when writing, running or debugging e2e. Run artifacts land in `.e2e/` (gitignored).

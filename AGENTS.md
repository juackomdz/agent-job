# AGENTS.md

## Project

Nuxt 4 (Vue 3 + TypeScript) job-search agent for the Chilean IT market. SSR app in `app/`, Nitro routes in `server/`, code shared by both in `shared/` (alias `#shared/*`). Prompts, tool descriptions and UI copy are in Spanish — keep it that way. Requires Node 22+.

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

| var                      | purpose                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `DB_FILE_NAME`           | SQLite file path (`process.env`; `*.db*` is gitignored)                   |
| `NUXT_APIFY_API_KEY`     | Apify MCP bearer token; `/api/chat` returns 500 when missing              |
| `NUXT_OPENAI_API_KEY`    | native OpenAI provider (only listed if set)                               |
| `NUXT_ANTHROPIC_API_KEY` | native Anthropic provider (only listed if set)                            |
| `NUXT_BASE_URL`          | OpenAI-compatible endpoint (`/models` must be available)                  |
| `NUXT_MODEL_API_KEY`     | auth for the compatible endpoint (any non-empty string for local servers) |
| `NUXT_DEFAULT_MODEL`     | preselected model id, e.g. `openai:gpt-5-mini`                            |

- Models are **not** configured in `.env`: the catalog comes from the adapters' `OPENAI_CHAT_MODELS` / `ANTHROPIC_MODELS` plus `GET {NUXT_BASE_URL}/models` for the compatible endpoint.
- Model ids are namespaced `proveedor:modelo`. `server/ai/utils/providers.ts` reads `useRuntimeConfig()` per call (not at import time), so new credentials show up after restarting the dev server; the UI fetches the catalog from `/api/models`.
- Nuxt CLI and drizzle-kit load `.env`; `pnpm start` passes `--env-file`. The built server otherwise only sees the real process env.

## Database (SQLite + drizzle)

- `shared/drizzle/db.ts` — `useDb()` lazy singleton over `better-sqlite3` (WAL, foreign keys on). It calls `mkdirSync(dirname(process.env.DB_FILE_NAME!))`, so a missing/undefined `DB_FILE_NAME` throws on first use.
- `server/ai/utils/tools.ts` calls `useDb()` at **module scope** → importing that module opens the DB, so a bad `DB_FILE_NAME` breaks `/api/chat` at import time, not only when a tool touches the DB.
- drizzle-orm is `1.0.0-rc.4` → use the new API (`drizzle({ client })`, `int().primaryKey()`, `text({ length })`, `sqliteTable(name, cols, (t) => [primaryKey(...), index(...)])`). v0 snippets from docs/blogs won't compile.
- **Migrations are committed**: edit `shared/drizzle/schema.ts`, then `pnpm db:generate` → `pnpm db:migrate`. Generated migrations live in `drizzle/<timestamp>_<name>/` (`migration.sql` + `snapshot.json`; 1.0 layout, no `meta/_journal.json`). The local `agent-job.db` tracks `__drizzle_migrations`, so this is the path in use; `db:push` is only a quick sync that skips history. drizzle-kit reads `process.env.DB_FILE_NAME` directly, not runtimeConfig.
- `shared/drizzle/repository.ts` — `saveCvProfile()` writes `cv_profiles` plus lowercased/deduped `cv_skills` in one transaction; `getCvProfile()` returns the latest row by `createdAt`.

## Architecture

- `app/` is the Nuxt 4 `srcDir`. Components are auto-imported. `app/app.vue` wraps every route in the `dashboard` layout (sidebar: Panel / Chat / Subir CV / Todas tus ofertas). Tailwind v4 + daisyUI live in `app/assets/css/main.css` (`garden` plus a custom `claro` theme; the layout hardcodes `data-theme="garden"`).
- Pages: `index.vue` (stats + top offers, SSR `useFetch`), `chat.vue` → `ChatPanel.vue`, `subir-cv.vue` (PDF upload + `ModelSelect`), `ofertas.vue` (full table + `Pagination`).
- `app/composables/useOffersTable.ts` owns the TanStack Table **v9** setup (`useTable` + `tableFeatures`, not v8's `useVueTable`); pages just wire `OffersTable` + `Pagination`. No default sort — clicking a header toggles it.
- `POST /api/chat` — body must be an AG-UI `RunAgentInput` (`threadId`, `runId`, `messages`, `tools`, `context`) parsed by `chatParamsFromRequestBody`; a bare `{ messages }` body is rejected. The per-request model arrives in `forwardedProps.model` (the client does `sendMessage(content, { body: { model } })`) and is resolved by `server/ai/utils/providers.ts`; unknown ids are 400. Streams SSE via `toServerSentEventsResponse`. Agent loop is capped at 20 iterations.
- Search comes from the **Apify MCP server** (`createMCPClient`, http transport `https://mcp.apify.com?tools=search-actors,fetch-actor-details,call-actor,apify/web-search,apify/web-fetch`, Bearer key) — remote MCP tools, not local functions. Local tools wired into `chat()`: `get_cv_data` (latest CV profile) and `save_job_tool` (insert into `offers`, unique `url`, `onConflictDoNothing`, `match` 0–100).
- Chat history uses `withPersistence(memoryPersistence())` → in-process memory only, wiped on server restart; `GET /api/chat` reconstructs a thread for the client. `ChatPanel.vue` hardcodes `threadId: 'chat-id'` + `persistence: true`, so every browser shares one thread per process.
- `server/ai/utils/providers.ts` — `getAvailableModels()` builds the catalog from the adapters' model lists (compatible endpoint cached 10 min on success, 60 s on failure; if it fails the provider is hidden, with no env fallback). `getDefaultModelId(models)` honors `NUXT_DEFAULT_MODEL` and otherwise prefers `gpt-5-mini` / `claude-sonnet-4-5`; `resolveAdapter()` (async) whitelists the id before creating an adapter.
- `server/api/models.get.ts` — GET `/api/models` → `{ models, default }`, never keys. The UI stores the picked id in the `ai-model` cookie via `app/composables/useModelSelection.ts` and renders it with `app/components/ModelSelect.vue` (searchable combobox grouped by provider; labels in `shared/models.ts`).
- `server/ai/utils/tools.ts` — the zod schemas are the tool contract. `save_profile` is defined but **not passed to `chat()`** → dead code unless you wire it (CV extraction lives in `/api/cv`, not the chat agent).
- `server/ai/utils/system.ts` — the Spanish system prompt; it is the spec for how the agent must use the tools (search → extract → score → save, only `match >= 60`). Update it whenever tool behaviour changes.
- `server/api/cv.post.ts` — POST `/api/cv`: multipart field name **`file`** (plus optional `model`), PDF only (415), ≤ 5 MB (413), text extracted with `unpdf`, structured output validated by `CvSchema` → `saveCvProfile`. Requires a provider that supports structured output.
- `server/api/offers.get.ts` — GET `/api/offers?limit=N` (limit optional) → rows ordered by id desc.
- `shared/cvSchema.ts` — zod `CvSchema` + `CvProfile` type, used by both CV extraction and the `cv_profiles.data` JSON column. `shared/types.ts` holds `Offer`, `ProviderId`, `ModelOption`, `ModelsResponse`; `shared/models.ts` holds `PROVIDER_LABELS` / `toModelId`.

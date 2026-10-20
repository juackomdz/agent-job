# AGENTS.md

## Project

Nuxt 4 (Vue 3 + TypeScript) job-search agent for the Chilean IT market. SSR app in `app/`, Nitro routes in `server/`, code shared by both in `shared/` (alias `#shared/*`). Prompts, tool descriptions and UI copy are in Spanish — keep it that way.

## Commands

- `pnpm dev` — dev server on `http://localhost:3000`
- `pnpm build` — works; run the build with `node .output/server/index.mjs`
- `pnpm generate` / `pnpm preview` — static build / preview
- `pnpm lint` — oxlint (currently clean, keep it clean)
- `pnpm fmt` / `pnpm fmt:check` — oxfmt, single quotes (`.oxfmtrc.json`). **oxfmt also formats Markdown**, so `pnpm fmt` also rewrites `README.md` / `AGENTS.md`.
- `pnpm db:push` — apply `shared/drizzle/schema.ts` to SQLite (see DB section)
- `pnpm db:generate` / `db:migrate` / `db:studio` — drizzle-kit
- `pnpm install` → runs `nuxt prepare` (postinstall); re-run it after adding deps or modules.
- **No typecheck (vue-tsc is not installed) and no test suite.**
- New native deps must be allowlisted in `allowBuilds` in `pnpm-workspace.yaml`, otherwise pnpm blocks their install scripts.

## Env

`.env` is gitignored and holds secrets — don't read it into the transcript and never commit it. `.env.example` is the template.

| var                   | maps to                      | used by                                                                                                                  |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `DB_FILE_NAME`        | `process.env`                | SQLite file path (`*.db` is gitignored)                                              |
| `NUXT_TAVILY_API_KEY` | `runtimeConfig.tavilyApiKey` | Tavily MCP endpoint                                                                                                      |
| `NUXT_BASE_URL`       | `runtimeConfig.baseUrl`      | OpenAI-compatible endpoint  |
| `NUXT_MODEL_API_KEY`  | `runtimeConfig.modelApiKey`  | model auth                                                                                                               |
| `NUXT_MODEL`          | `runtimeConfig.model`        | model id                                                                                                                 |

- Nuxt CLI loads `.env` in dev/build and drizzle-kit loads it too (dotenv dep). The built server only sees the real process env → export the vars before `node .output/server/index.mjs`.
- `server/ai/utils/adapter.ts` calls `useRuntimeConfig()` at module scope → config is frozen at import time; restart the dev server after editing `.env`.

## Database (SQLite + drizzle)

- `shared/drizzle/db.ts` — `useDb()` lazy singleton over `better-sqlite3` (WAL, foreign keys on); creates the parent dir of `DB_FILE_NAME` on first use.
- `server/ai/utils/tools.ts` calls `useDb()` at **module scope** → importing that module opens the DB, so a missing/invalid `DB_FILE_NAME` breaks `/api/chat` at import time, not only when a tool touches the DB.
- **No migrations are committed**: `drizzle.config.ts` points `out: './drizzle'` but that folder doesn't exist. Edit `shared/drizzle/schema.ts`, then run `pnpm db:push` (it asks for confirmation before applying). drizzle-kit reads `process.env.DB_FILE_NAME` directly, not runtimeConfig.
- drizzle-orm is `1.0.0-rc.4` → use the new API (`drizzle({ client })`, `int().primaryKey()`, `text({ length })`, `sqliteTable(name, cols, (t) => [primaryKey(...), index(...)])`). v0 snippets from docs/blogs won't compile.
- `shared/drizzle/repository.ts` — `saveCvProfile()` writes `cv_profiles` plus lowercased/deduped `cv_skills` in one transaction; `getCvProfile()` returns the latest row by `createdAt`.

## Architecture

- `app/` is the Nuxt 4 `srcDir`. Components are auto-imported. `app/app.vue` wraps every route in the `dashboard` layout (sidebar: Panel / Chat / Subir CV / Todas tus ofertas). Tailwind v4 + daisyUI live in `app/assets/css/main.css` (theme `garden` default plus a custom `claro` theme).
- Pages: `index.vue` (dashboard: stats + top offers, SSR `useFetch`), `chat.vue` → `ChatPanel.vue` (SSE chat via `@tanstack/ai-vue` `useChat({ connection: fetchServerSentEvents('/api/chat') })`), `subir-cv.vue` (PDF upload form), `ofertas.vue` (full table + pagination).
- `app/composables/useOffersTable.ts` owns the TanStack Table v9 setup (sort by `match` desc, pagination); pages just wire `OffersTable` + `Pagination`.
- `server/api/chat.post.ts` — POST `/api/chat` (body `{ messages }`) → SSE via `toServerSentEventsResponse`. The model comes from `server/ai/utils/adapter.ts`; `adapter` is a **factory** (`adapter(modelName)` selects the model from the `models` tuple). Search tools come from the **Tavily MCP server** (`createMCPClient`, http transport `https://mcp.tavily.com/mcp/?tavilyApiKey=…`) — remote MCP tools, not local functions. Wired local tools: `get_cv_data` (read the latest CV profile) and `save_job_tool` (insert into `offers`, unique `url`, `onConflictDoNothing`, `match` 0–100).
- `server/ai/utils/tools.ts` — the zod schemas are the tool contract. `save_profile` is defined but **not passed to `chat()`** → dead code unless you wire it.
- `server/ai/utils/system.ts` — the Spanish system prompt; it is the spec for how the agent must use the tools (search → extract → score → save, only `match >= 60`). Update it whenever tool behaviour changes.
- `server/api/cv.post.ts` — POST `/api/cv`: multipart field name **`file`**, PDF only (415 otherwise), ≤ 5 MB, text extracted with `unpdf`, structured output validated by `CvSchema` → `saveCvProfile`. Requires a provider that supports structured output.
- `server/api/offers.get.ts` — GET `/api/offers?limit=N` (limit optional) → rows ordered by id desc.
- `shared/cvSchema.ts` — zod `CvSchema` + `CvProfile` type, used by both the CV extraction and the `cv_profiles.data` JSON column. `shared/types.ts` holds the `Offer` type used by the frontend table.

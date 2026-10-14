# AGENTS.md

## Project

Nuxt 4 (Vue 3 + TypeScript) job-search agent for the Chilean IT market. Vue SPA + Nitro API routes. Prompts, tool descriptions, and UI copy are in Spanish.

## Notes

- Never check `.env` files.
- Required env, auto-loaded from `.env` (Nuxt in dev, drizzle-kit): `DB_FILE_NAME` (SQLite path), `NVIDIA_API`, `TAVILY_API_KEY`.
- `pnpm fmt:check` currently fails on ~19 files (repo is not oxfmt-clean). `pnpm fmt` rewrites them (adds semicolons/trailing commas) — don't attribute that churn to your own change.
- `pnpm lint` warnings are expected: unused `adapter` import in `server/api/chat.post.ts`, unused `id` in `server/api/test.get.ts`.

## Commands

- `pnpm dev` — dev server on `localhost:3000`
- `pnpm build` / `pnpm generate` / `pnpm preview`
- `pnpm lint` — oxlint
- `pnpm fmt` / `pnpm fmt:check` — oxfmt (single quotes + semicolons); also formats **Markdown**.
- `pnpm install` — runs `nuxt prepare` via postinstall; re-run after adding modules or deps.
- `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` — drizzle-kit.
- **No typecheck** (vue-tsc not installed) and **no tests**.

## Env & SQLite

- DB is SQLite at `./test.db` (gitignored). `shared/drizzle/db.ts` lazily opens it via `useDb()` using `DB_FILE_NAME`. `drizzle.config.ts` sets `out: './drizzle'` but **no migrations are committed**; schema lives in `shared/drizzle/schema.ts` and is applied with `pnpm db:push`. Fresh clone: run `db:push` first.
- Native deps (`better-sqlite3`, esbuild, `@google/genai`, `@openrouter/sdk`) need entries in `pnpm-workspace.yaml` `allowBuilds` or pnpm blocks their install scripts — add new native deps there.

## Architecture

- `app/` SPA, components auto-imported. `pages/chat.vue` → `Test.vue` (chat via `@tanstack/ai-vue` `useChat(fetchServerSentEvents('/api/chat'))`); `pages/uploadcv.vue` → `Upload.vue` (client-side text parse of txt/md, then feeds the CV text into `/api/chat`; PDFs there are only read as text and usually fail); `pages/upload-test.vue` POSTs a PDF form to `/api/cv`; `index.vue` is a stub.
- `server/api/chat.post.ts` — POST `/api/chat`, SSE via `toServerSentEventsResponse`. Live path: NVIDIA `openaiCompatible` (model `openai/gpt-oss-20b`, `https://integrate.api.nvidia.com/v1`) + Tavily **MCP** client — `tavily_search`/`tavily_extract` are MCP tools, not local ones. Its `adapter` import is dead.
- `server/api/cv.post.ts` — POST `/api/cv`, multipart PDF only (≤5 MB) → extracts text with `unpdf` → structured `CvSchema` completion through `server/ai/utils/adapter.ts` (`openaiCompatibleText` against **local llama.cpp at `http://localhost:8080/v1`**) → `saveCvProfile`. This route needs that local server running (unlike `/api/chat`).
- `server/api/test.get.ts` — dev helper returning `get_data` output.
- `server/ai/utils/tools.ts` — `toolDefinition`s (zod is the contract): `get_data` (`get_cv_data`, reads latest CV profile) and `save_job` (`save_job_tool`, inserts into `offers`, unique `url`, `onConflictDoNothing`, match 0–100). Only these two are passed to `chat()`; `save_profile` is defined but unwired. `getparsedcv*`/`test_tool` are gone.
- `server/ai/utils/system.ts` — static Spanish prompt; CV data comes from the DB via `get_cv_data`. Root `cv.json` is tracked (real candidate PII) but **not imported anywhere**.
- `shared/` — Nuxt 4 built-in shared dir, alias `#shared/*`: `drizzle/*` (db, schema, repository) and `cvSchema.ts` (`CvSchema`/`CvProfile`). `types.ts` (Tavily REST types) is unused. drizzle-orm is `1.0.0-rc` — use the new API (`drizzle({ client })`, `int().primaryKey()`), not v0 patterns.

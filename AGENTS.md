# AGENTS.md

## Project

Nuxt 4 (Vue 3 + TypeScript) job-search agent for the Chilean IT market. Vue SPA + one Nitro SSE route. Prompts, tool descriptions, and UI copy are in Spanish.

## Commands

- `pnpm dev` — dev server on `localhost:3000`
- `pnpm build` / `pnpm generate` / `pnpm preview`
- `pnpm lint` — oxlint (warnings are acceptable; e.g. unused imports in `server/api/chat.post.ts` are pre-existing)
- `pnpm fmt` / `pnpm fmt:check` — oxfmt; single quotes enforced. oxfmt also checks **Markdown** — formatting `AGENTS.md` wrong fails the check.
- `pnpm install` — runs `nuxt prepare` via postinstall; re-run after adding modules or deps.
- `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` — drizzle-kit (auto-loads `.env`).
- **No typecheck**: `nuxt typecheck` errors (vue-tsc not installed). No test framework.

## Env & SQLite

- `.env` is gitignored; dev vars live there: `DB_FILE_NAME=./test.db`, `NVIDIA_API`, `TAVILY_API_KEY`, plus unused `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `OPENCODE_API`. Never commit real keys.
- DB is SQLite at `./test.db` (gitignored). `shared/drizzle/db.ts` opens it at import time via `DB_FILE_NAME!`. **`drizzle/` holds no committed migrations**; schema lives in `shared/drizzle/schema.ts` and is applied with `pnpm db:push`. Fresh clone: run `db:push` first.
- Native deps (`better-sqlite3`, esbuild, @google/genai, @openrouter/sdk) require entries in `pnpm-workspace.yaml` `allowBuilds` or pnpm blocks their install scripts — add new native deps there.

## Architecture

- `app/` — SPA. `pages/chat.vue` → `Test.vue`, `pages/uploadcv.vue` → `Upload.vue`; both connect via `@tanstack/ai-vue` `useChat(fetchServerSentEvents('/api/chat'))`. Components are auto-imported. `Upload.vue` parses CVs client-side (pdf/txt/md/docx) — there is no file-upload endpoint.
- `server/api/chat.post.ts` — the only API route (POST `/api/chat`, SSE via `toServerSentEventsResponse`). Active adapter: NVIDIA `openaiCompatible` (model `openai/gpt-oss-20b`, `https://integrate.api.nvidia.com/v1`) + Tavily MCP client. Gemini / llama.cpp / `openaiCompatibleText` code is commented out — don't treat it as the live path.
- `server/ai/utils/tools.ts` — `toolDefinition`s with zod schemas as the contract: `search_tool` & `extract_tool` (Tavily REST), `save_job` (inserts into `offers`, unique `url`, `onConflictDoNothing`, match 0–100). `getparsedcvDef` and `test_tool` are unused.
- `server/ai/utils/system.ts` — system prompt embeds `cv.json` (root file, tracked, alias `@@/`). Editing `cv.json` changes assistant behavior; it is the candidate's CV, not test data.
- `shared/` — Nuxt alias `#shared/*` (in `server/ai` code): `shared/drizzle/*` (db + schema) and `shared/types.ts` (Tavily types).
- drizzle-orm is `1.0.0-rc` — new API style (`drizzle({ client })`, `int().primaryKey()`); don't write legacy v0 patterns.

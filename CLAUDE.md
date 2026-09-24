# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — plataforma para jugar online y competir por puntos. The visual MVP, the landing, the about/contact page, the Supabase wiring, the real leaderboard and the ported games are done (SPEC 01–09, all marked `Implementado`). `references/implemented-games.md` is the up-to-date list of playable games; the remaining catalog entries are still mock players.

Built with Spec Driven Design using the `/spec` and `/spec-impl` skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`). Write the spec first, then implement against it. Specs live in `specs/NN-slug.md` with a header block (`Estado`, `Depende de`, `Fecha`, `Objetivo`); `specs/.spec-config.yml` sets `AutoCreateBranch: true`, so `/spec-impl` branches as `spec-NN-slug` on its own.

## Stack notes that differ from older Next.js

- **Next 16 + React 19.** Read `node_modules/next/dist/docs/` before writing framework code — see AGENTS.md. Docs are split `01-app/` (App Router, the one in use), `02-pages/`, `03-architecture/`.
- **Typed route props are global.** `app/layout.tsx` uses `LayoutProps<"/">` with no import; pages get `PageProps<"/route">` (e.g. `PageProps<"/jugar/[id]">`). These are generated into `.next/types` — run `npm run dev` or `npm run build` once so they resolve.
- **`proxy.ts`, not `middleware.ts`.** Next 16 renames it: the root `proxy.ts` exports `proxy()` + `config.matcher` and delegates to `updateSession()` in `lib/supabase/proxy.ts` to refresh the Supabase session cookie.
- **Tailwind v4, CSS-first config.** No `tailwind.config.*`. Theme tokens live in `@theme inline` inside `app/globals.css`; PostCSS wiring is `@tailwindcss/postcss` only. Most of the arcade look is hand-written CSS in `globals.css` (`.av-detail`, `.cover-bg`, `.game-arena`…), not utility classes — extend that sheet rather than re-styling with utilities.
- **ESLint flat config** composing `eslint-config-next/core-web-vitals` + `/typescript`, plus `eslint-config-prettier`. Prettier is the formatter (`npm run format`).
- `@/*` maps to the repo root.

## Architecture

### Routes (`app/`)

- `/` landing, `/about` + contact form, `/games` library (cards + sortable table), `/games/[id]` detail with leaderboard, `/jugar/[id]` the player, `/salon` hall of fame, `/auth` sign-in.
- `/jugar/[id]` holds the player registry: `PLAYERS: Record<string, ComponentType<{ game: Game }>>` maps each implemented game (listed in `references/implemented-games.md`) to its real player; every other id falls back to the `GamePlayer` mock. Adding a ported game means adding a line there.

### API (Route Handlers)

- `GET /api/games` — catalog joined with the `game_stats` view; returns `GameWithStats = Game & { best, plays }`. Read with the publishable key through RLS.
- `GET|POST /api/scores` — top N for a game (`rank` is computed per response, not stored) and score insert. The insert is the only place `lib/supabase/admin.ts` and the secret key are used.
- `POST /api/contact` — Resend email.
- `GET /api/health/supabase` — diagnostics.
- Both data routes set `export const dynamic = "force-dynamic"`; caching them would freeze the leaderboard.

### Data (Supabase)

- Schema in `supabase/migrations/`: `0001_games_scores.sql` creates `games`, `scores`, the `game_stats` view and RLS; `0002`–`0005` seed the catalog and each ported game. A new game needs its own seed migration.
- **RLS opens `select` only.** There is deliberately no insert/update/delete policy — the browser key cannot write. Writes go through `POST /api/scores` with the secret key, which bypasses RLS. Adding an insert policy would make the Route Handler's validation decorative.
- Clients: `lib/supabase/client.ts` (browser), `server.ts` (RSC/handlers), `proxy.ts` (session refresh), `admin.ts` (secret key, server-only, scores insert only).
- Env vars are documented in `.env.example`. `SUPABASE_SECRET_KEY` must never gain a `NEXT_PUBLIC_` prefix.
- The Supabase MCP server is configured in `.mcp.json` (project `ovavqjmkteyaigcolbqv`).

### Games

- Engine per game in `lib/games/<name>/` — typically `engine.ts` + `entities.ts` (+ `sprites.ts`, `levels.ts`). The engine is framework-free: React mounts it, drives it and destroys it; it emits `onState` ({ `score`, `lives`, `level`, `status` }) and `onGameOver(score)` and never draws HUD or overlays.
- Per game, two client components in `components/games/`: `<name>-canvas.tsx` (canvas + input) and `<name>-player.tsx` (state, wiring).
- `components/player-shell.tsx` is the shared frame: HUD, CRT border, pause/end/restart buttons and the save-score modal. It never computes score or level — the game passes them in.
- Binary assets live in `public/games/<id>/`; the untouched originals stay in `references/`.
- `lib/games.ts` is the seeded catalog (`Game`, `GAMES`, `CATS`, `getGame`, `formatScore`). `Game` has no `best`/`plays` — those come from the API.
- `references/implemented-games.md` lists which games are actually playable — id, title, category, color, tagline. It is the single source of truth for that list: add a row there when a new game ships, and never copy the list back into this file. Every other id in `GAMES` is still a mock catalog entry with no engine.

### Session

`components/session-provider.tsx` is a localStorage-backed pseudo-session (`av_user`), not Supabase Auth: `signIn(name)`, `signOut()`, `saveScore()` which returns the server response instead of swallowing it. It hydrates after mount so the first render matches the signed-out server HTML.

## Skills

- Usa siempre `/frontend-design` para diseñar la interfaz del usuario.
- `/add-game` (`.claude/skills/add-game/`) writes the spec for a new game — engine port, player, catalog entry, seed migration, leaderboard — from a `references/started-games/` folder or from scratch. It only writes the spec; `/spec-impl` implements it. Its `reference.md` holds the platform contracts (catalog types, engine API, taken ids and `sort_order`); keep it in sync when those change.

## Hooks

`.claude/settings.json` registers a `PostToolUse` hook on Write/Edit/MultiEdit/NotebookEdit: `.claude/hooks/format-and-lint.sh` runs Prettier and then `eslint --fix` on the file just written, and fails the tool call (exit 2) when either cannot be satisfied. Skips `node_modules/`, `.next/`, `references/`, `.git/`.

## Conventions

- App Router with Server Components by default; add `"use client"` only where interactivity requires it.
- Comments in the codebase are in Spanish and explain _why_, not _what_. Match that.
- Dark mode is `prefers-color-scheme` driven via `dark:` variants — support both themes in new UI.
- Typography tokens are `--font-pixel` (Press Start 2P) and `--font-mono`; `body` uses the mono token. Use the tokens, not raw font stacks.

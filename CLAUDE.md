# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — plataforma para jugar online y competir por puntos. Currently a bare `create-next-app` scaffold: `app/layout.tsx` + `app/page.tsx` are still the generated starter content. Nearly all feature work starts from scratch.

Built with Spec Driven Design using the `/spec` and `/spec-impl` skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`). Write the spec first, then implement against it.

## Commands

```bash
npm run dev      # dev server (also regenerates the AGENTS.md agent block)
npm run build
npm start        # serve the production build
npm run lint     # eslint (flat config, no `next lint`)
npx tsc --noEmit # typecheck; tsconfig has noEmit, so this is the only type gate
```

No test runner is configured yet.

## Stack notes that differ from older Next.js

- **Next 16 + React 19.** Read `node_modules/next/dist/docs/` before writing framework code — see AGENTS.md. Docs are split `01-app/` (App Router, the one in use), `02-pages/`, `03-architecture/`.
- **Typed route props are global.** `app/layout.tsx` uses `LayoutProps<"/">` with no import; pages get `PageProps<"/route">`. These are generated into `.next/types` — run `npm run dev` or `npm run build` once so they resolve.
- **Tailwind v4, CSS-first config.** No `tailwind.config.*`. Theme tokens live in `@theme inline` inside `app/globals.css`; PostCSS wiring is `@tailwindcss/postcss` only.
- **ESLint flat config** composing `eslint-config-next/core-web-vitals` + `/typescript`.
- `@/*` maps to the repo root.

## Conventions

- App Router with Server Components by default; add `"use client"` only where interactivity requires it.
- Dark mode is `prefers-color-scheme` driven via `dark:` variants — support both themes in new UI.
- `app/globals.css` still sets `body { font-family: Arial... }`, which fights the Geist `--font-sans` token. Fix it rather than working around it when touching typography.

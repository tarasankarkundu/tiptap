# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm install` — install dependencies
- `pnpm dev` — start Vite dev server with HMR
- `pnpm build` — type-check with vue-tsc then build with Vite
- `pnpm build-only` — build without type-checking
- `pnpm type-check` — run vue-tsc type checking
- `pnpm preview` — preview production build locally

## Architecture

Vue 3 + TypeScript + Vite + vue-router learning dashboard for tiptap editor. Entry point is `src/main.ts`.

- **Path alias:** `@` maps to `./src`
- **SFC style:** Use `<script setup lang="ts">` in Vue single-file components
- **Node requirement:** ^20.19.0 || >=22.12.0
- **Routing:** vue-router 4 — dashboard home (`/`) with card grid, individual editor pages (`/example/:slug`)
- **tiptap v3 imports:** Use named imports (`import { Table } from '@tiptap/extension-table'`), not default imports. StarterKit v3 includes Link and Underline — do not install them separately.
- **Menus:** `import { BubbleMenu, FloatingMenu } from '@tiptap/vue-3/menus'` (NOT from `@tiptap/vue-3`)

## Key Files

- `src/router/index.ts` — route definitions with meta (title, description, editorComponent)
- `src/views/DashboardView.vue` — dashboard home with grouped example cards
- `src/views/ExampleView.vue` — generic wrapper that loads the correct editor component and explanation data
- `src/components/EditorPage.vue` — shared layout for all example pages
- `src/components/ExplanationPanel.vue` — packages, behavior, code, and components documentation
- `src/components/OutputInspector.vue` — real-time HTML/JSON/Text output viewer
- `src/components/examples/` — 8 self-contained editor examples
- `openspec.md` — full project specification

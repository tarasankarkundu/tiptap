# OpenSpec: Tiptap Learning Dashboard

## Overview

A Vue 3 + TypeScript single-page application that serves as an interactive learning dashboard for the tiptap rich text editor framework. The dashboard presents 10 example editors grouped by category, each on its own page with an interactive editor, an explanation panel documenting packages/behavior/code, and an output inspector showing real-time HTML/JSON/Text serialization.

## Technology Stack

- **Framework:** Vue 3.5+ with Composition API (`<script setup lang="ts">`)
- **Build tool:** Vite 7.x
- **Language:** TypeScript 5.9+
- **Routing:** vue-router 4
- **Editor:** tiptap 3.19+ (based on ProseMirror)
- **Package manager:** pnpm

## Pages

### Dashboard Home (`/`)

A grid of clickable cards grouped under 4 categories:

1. **Core Editing** — Basic Rich Text, Bubble & Floating Menus
2. **Content Types** — Task Lists, Images & Links, Tables
3. **Styling & Formatting** — Text Styling & Colors
4. **UX & Advanced** — Placeholder & Character Count, Custom Vue Node View, Notion-like Editor, AI-Powered Editor

Each card displays the example title, a short description, and navigates to the example's dedicated page.

### Example Editor Pages (`/example/:slug`)

Each page contains:

1. **Back link** to dashboard
2. **Title and description** of the example
3. **Interactive editor** with a focused toolbar demonstrating the relevant tiptap commands
4. **Explanation panel** (expanded by default) with:
   - Packages used and their purpose
   - How it works (behavior description and what to try)
   - Key code snippet showing the extension/editor setup
   - Components involved and their roles
5. **Output inspector** (collapsed by default) with 3 tabs:
   - HTML — `editor.getHTML()`
   - JSON — `editor.getJSON()` pretty-printed
   - Text — `editor.getText()`
   - Updates in real-time as the user edits

## Examples Specification

### 1. Basic Rich Text (`/example/basic`)

**Extensions:** StarterKit (includes bold, italic, strike, headings, lists, code block, blockquote, undo/redo, link, underline)

**Toolbar:** Bold, Italic, Strike, H1, H2, Bullet List, Ordered List, Code Block, Blockquote, Undo, Redo

**Initial content:** Sample paragraph with placeholder text.

**Learning goals:** Understand the `chain().focus().toggle*().run()` command pattern, `editor.isActive()` for toolbar state, and how StarterKit bundles common extensions.

### 2. Bubble & Floating Menus (`/example/menus`)

**Extensions:** StarterKit

**Components:** `BubbleMenu`, `FloatingMenu` from `@tiptap/vue-3/menus`

**Behavior:**
- BubbleMenu appears when text is selected, offering Bold/Italic/Strike/Link toggles
- FloatingMenu appears on empty lines, offering H1/H2/Bullet List/Ordered List

**No static toolbar.** The menus are the UI.

**Initial content:** Multiple paragraphs of text with an empty paragraph at the end.

**Learning goals:** Context-sensitive toolbars, the v3 import path for menus, how BubbleMenu/FloatingMenu are Vue components (not extensions).

### 3. Task Lists (`/example/task-lists`)

**Extensions:** StarterKit, `@tiptap/extension-task-list`, `@tiptap/extension-task-item` (configured with `nested: true`)

**Toolbar:** Toggle Task List button, plus standard list buttons for comparison

**Initial content:** Pre-filled task list with nested items, some checked.

**Learning goals:** Installing extensions beyond StarterKit, the `data-type` attribute pattern for custom nodes, nested task configuration.

### 4. Images & Links (`/example/images-links`)

**Extensions:** StarterKit (with link configured `openOnClick: false`), `@tiptap/extension-image` (configured with `inline: true`, `allowBase64: true`)

**Toolbar:** Add Image (URL prompt), Set Link (URL prompt), Unset Link

**Initial content:** Paragraph with instructions to try inserting images and links.

**Learning goals:** `setImage()` and `setLink()` commands, `extendMarkRange('link')` for updating existing links, configuring StarterKit sub-extensions.

### 5. Tables (`/example/tables`)

**Extensions:** StarterKit, `@tiptap/extension-table` (configured with `resizable: true`), `@tiptap/extension-table-row`, `@tiptap/extension-table-header`, `@tiptap/extension-table-cell`

**Toolbar:** Insert 3x3 Table, Add Row Before/After, Delete Row, Add Column Before/After, Delete Column, Merge Cells, Split Cell, Delete Table

**Initial content:** Instructions to insert a table.

**Learning goals:** Multi-package extensions that must be installed together, the table command API, resizable columns.

### 6. Text Styling & Colors (`/example/text-styling`)

**Extensions:** StarterKit, `@tiptap/extension-text-style`, `@tiptap/extension-color`, `@tiptap/extension-highlight` (configured with `multicolor: true`), `@tiptap/extension-text-align` (configured for heading and paragraph types)

**Toolbar:** Color picker input, highlight color swatches (yellow/green/pink/blue), text alignment buttons (left/center/right/justify), underline toggle

**Initial content:** Sample text for styling.

**Learning goals:** The TextStyle + Color pattern, mark extensions with attributes, multi-color highlights, text alignment on specific node types.

### 7. Placeholder & Character Count (`/example/placeholder-count`)

**Extensions:** StarterKit, `@tiptap/extension-placeholder` (configured with placeholder text), `@tiptap/extension-character-count` (configured with `limit: 280`)

**Toolbar:** Standard formatting buttons

**Initial content:** Empty (so placeholder is visible)

**Below editor:** Progress bar showing character count / 280 limit, word count. Bar turns red near limit.

**Learning goals:** UX polish extensions, reading from `editor.storage.characterCount`, reactive computed properties from editor state, the `is-editor-empty` CSS pseudo-pattern for placeholder.

### 8. Custom Vue Node View (`/example/custom-node-view`)

**Extensions:** StarterKit, custom `CounterExtension`

**Toolbar:** "Insert Counter" button

**CounterExtension:** Defines an `atom` block node with a `count` attribute. Uses `VueNodeViewRenderer` to render `CounterWidget.vue` inside the editor.

**CounterWidget.vue:** Renders inside `NodeViewWrapper` with increment/decrement buttons and a delete button. Uses `updateAttributes()` to modify the count and `deleteNode()` to remove itself.

**Initial content:** Paragraph with instructions, plus one pre-inserted counter widget.

**Learning goals:** `VueNodeViewRenderer`, `NodeViewWrapper`, `NodeViewContent`, `nodeViewProps`, the `atom: true` node property, `updateAttributes()` and `deleteNode()` from node view props.

### 9. Notion-like Editor (`/example/notion-editor`)

**Extensions:** StarterKit, TaskList, TaskItem (nested), Image, Placeholder, custom SlashCommandExtension (built on `@tiptap/suggestion`)

**Features:**
- **Slash Commands:** Type `/` to open a filterable command dropdown. Items: H1, H2, H3, Bullet List, Ordered List, Task List, Blockquote, Code Block, Horizontal Rule, Image. Navigate with ArrowUp/Down, select with Enter or click, dismiss with Escape. Built using `@tiptap/suggestion` + `tippy.js` for popup positioning.
- **Drag Handle:** A grip icon + "+" button appears on the left when hovering over any block. The "+" button inserts a `/` at the block to trigger the slash menu. Implemented with mousemove event tracking and getBoundingClientRect().
- **Dark Mode:** Toggle via toolbar button. Uses CSS custom properties on `[data-theme="dark"]`. Preference saved in localStorage.

**File structure:**
- `notion/SlashCommandExtension.ts` — Extension wrapping @tiptap/suggestion with render lifecycle (onStart/onUpdate/onKeyDown/onExit)
- `notion/SlashCommandList.vue` — Filterable, keyboard-navigable dropdown component
- `notion/slash-command-items.ts` — Command definitions array
- `notion/notion-dark-mode.css` — CSS custom properties for light/dark theme

**Initial content:** Welcome text with instructions to try slash commands, drag handles, and dark mode.

**Learning goals:** Building custom extensions with `@tiptap/suggestion`, tippy.js popup lifecycle, CSS custom properties for theming, block-level DOM interaction patterns.

### 10. AI-Powered Editor (`/example/ai-editor`)

**Extensions:** StarterKit, Placeholder

**Features:**
- **AI Chat:** Bottom prompt bar for free-form instructions. Streams responses from any OpenAI-compatible API via SSE (Server-Sent Events). Each token is inserted at the cursor position in real time using `insertContentAt()`.
- **Quick Actions:** Preset buttons — Continue writing, Summarize, Fix grammar, Make shorter, Make longer. Selection-dependent actions are disabled when no text is selected.
- **Selection-aware:** If text is selected, AI replaces the selection. If not, AI inserts at cursor.
- **Configurable:** Settings panel for API key (stored in localStorage), model name (default: gpt-4o-mini), and API URL (default: OpenAI endpoint). No paid tiptap packages required.
- **Error handling:** 401 → "Invalid API key", 429 → "Rate limit exceeded", network failures → generic error. Shown as red banner. Stop button aborts generation via AbortController.

**File structure:**
- `ai/ai-service.ts` — Fetch + ReadableStream SSE parser for OpenAI-compatible chat completions
- `ai/api-key-dialog.ts` — localStorage management for API key, model, URL
- `ai/useAiChat.ts` — Composable: builds messages, handles selection, streams tokens into editor
- `ai/AiPromptBar.vue` — Bottom input bar with Send/Stop buttons
- `ai/AiQuickActions.vue` — Preset action buttons with selection awareness

**Initial content:** Welcome text with instructions to configure API key and try AI features.

**Learning goals:** Integrating external APIs with tiptap, SSE streaming with ReadableStream, selection-aware editor commands, AbortController for cancellation, localStorage-based configuration.

## Shared Components

### ExampleCard
Clickable card for the dashboard grid. Props: `title`, `description`, `to` (route path).

### EditorPage
Shared wrapper for all example pages. Props: `title`, `description`, `explanation`. Provides consistent layout with back link, content area, explanation panel, and output inspector.

### ExplanationPanel
Renders structured explanation data with sections for packages, behavior, code snippets, and components. Collapsible (expanded by default).

### OutputInspector
Real-time serialization viewer. Props: `editor`. Three tabs (HTML/JSON/Text). Collapsible (collapsed by default). Listens to the editor's `update` event.

## Dependencies

### Production
| Package | Purpose |
|---------|---------|
| `vue` ^3.5 | Core framework |
| `vue-router` ^4 | Page routing |
| `@tiptap/vue-3` ^3.19 | Vue 3 integration for tiptap |
| `@tiptap/pm` ^3.19 | ProseMirror core |
| `@tiptap/starter-kit` ^3.19 | Bundle of common extensions |
| `@tiptap/extension-task-list` | Task list nodes |
| `@tiptap/extension-task-item` | Task item nodes with checkboxes |
| `@tiptap/extension-image` | Image node support |
| `@tiptap/extension-table` | Table node |
| `@tiptap/extension-table-row` | Table row node |
| `@tiptap/extension-table-header` | Table header cell node |
| `@tiptap/extension-table-cell` | Table cell node |
| `@tiptap/extension-color` | Text color mark |
| `@tiptap/extension-text-style` | TextStyle mark (required by Color) |
| `@tiptap/extension-text-align` | Text alignment attribute |
| `@tiptap/extension-highlight` | Text highlight mark |
| `@tiptap/extension-placeholder` | Placeholder text for empty editor |
| `@tiptap/extension-character-count` | Character/word counting with limits |
| `@tiptap/suggestion` | Suggestion plugin for slash commands |
| `tippy.js` | Popup positioning for slash command dropdown |

## Route Map

| Path | View | Lazy-loaded |
|------|------|-------------|
| `/` | DashboardView | No |
| `/example/basic` | BasicEditor | Yes |
| `/example/menus` | BubbleFloatingMenuEditor | Yes |
| `/example/task-lists` | TaskListEditor | Yes |
| `/example/images-links` | ImageLinkEditor | Yes |
| `/example/tables` | TableEditor | Yes |
| `/example/text-styling` | TextStylingEditor | Yes |
| `/example/placeholder-count` | PlaceholderCountEditor | Yes |
| `/example/custom-node-view` | CustomNodeViewEditor | Yes |
| `/example/notion-editor` | NotionEditor | Yes |
| `/example/ai-editor` | AiEditor | Yes |

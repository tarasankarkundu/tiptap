# MeldEditor Architecture

## System Overview

MeldEditor is a pluggable rich-text editor Vue 3 component built on three layers:

```
 Consumer App (Vue 3)
       |
       v
 +--------------------------+
 |     MeldEditor.vue       |  Props / Events / Slots / Expose
 +--------------------------+
       |
       v
 +----------+  +----------+  +----------+
 | tiptap   |  | MeldUI   |  | Tabler   |
 | (editor  |  | (UI      |  | (icons)  |
 |  engine) |  |  prims)  |  |          |
 +----------+  +----------+  +----------+
       |
       v
 +----------+
 |ProseMirror|  (document model, transactions, schema)
 +----------+
```

- **tiptap v3** — Editor engine. Manages the document model, extensions, commands, and input handling.
- **@meldui/vue** — UI primitives (Button, Toggle, Tooltip, Dialog, DropdownMenu, ScrollArea, Separator, Input). Provides consistent styling, accessibility, and dark mode support.
- **@meldui/tabler-vue** — 6000+ icons. All editor icons use Tabler components instead of inline SVGs.
- **@meldui/charts-vue** — Chart components (Phase 2). Renders data charts inside the editor as custom nodes.

---

## Component Hierarchy

```
MeldEditor.vue
 |
 +-- [header slot]                  (consumer-controlled: Edit/Update/Close/Share buttons)
 |
 +-- EditorToolbar.vue              (slot: toolbar — hidden by default)
 |    +-- MeldUI Toggle + Tooltip
 |    +-- Tabler Icons
 |
 +-- EditorContent (tiptap)         (core editor area)
 |
 +-- DragHandle.vue                 (block drag-and-drop)
 |    +-- Tabler IconPlus, IconGripVertical
 |
 +-- TextBubbleMenu.vue             (slot: bubble-menu)
 |    +-- tiptap BubbleMenu
 |    +-- MeldUI Toggle + Separator
 |    +-- Tabler Icons
 |
 +-- TableControls.vue              (table row/col handles)
 |    +-- MeldUI DropdownMenu
 |    +-- Tabler Icons
 |
 +-- ImageUrlDialog.vue             (replaces window.prompt)
 |    +-- MeldUI Dialog + Input + Button
 |
 +-- ResizableImageView.vue         (tiptap NodeView)
      +-- MeldUI Toggle + Button
      +-- Tabler Icons
      +-- Resize handles + Caption
```

### Sub-component Responsibilities

| Component | Responsibility | Replaces |
|---|---|---|
| `EditorToolbar` | Renders toolbar items from `ToolbarItem[]` config. **Hidden by default** (Notion-like = bubble menu + slash commands). No theme toggle — theme is app-level. | Hardcoded toolbar in NotionEditor lines 317-363 |
| `TextBubbleMenu` | Text formatting popup on selection (bold, italic, align, etc.) | Hardcoded BubbleMenu in NotionEditor lines 406-526 |
| `DragHandle` | Shows +/grip on block hover, handles drag-and-drop reordering | Inline logic in NotionEditor lines 62-268 |
| `TableControls` | Row/column handles and context menu for table manipulation | Current TableControls.vue with custom menu |
| `ResizableImageView` | Image node view with resize handles, alignment, caption, bubble menu | Current ResizableImageView.vue with inline SVGs |
| `ImageUrlDialog` | Modal dialog for entering image URL | `window.prompt()` calls |
| `SlashCommandExtension` | tiptap extension for `/` command suggestions | Current SlashCommandExtension.ts with hardcoded items |
| `SlashCommandList` | Popup list UI for slash command selection | Current SlashCommandList.vue with custom styling |

---

## Data Flow

### Content (v-model pattern)

```
Consumer                    MeldEditor                    tiptap
   |                            |                           |
   |-- modelValue (HTML) ------>|                           |
   |                            |-- useEditor({ content }) >|
   |                            |                           |
   |                            |<-- onUpdate --------------|
   |<-- emit update:modelValue -|                           |
   |<-- emit update:json -------|                           |
   |                            |                           |
   |-- modelValue changes ----->|                           |
   |                            |-- watch: setContent() --->|
```

- **Inbound:** `modelValue` prop (HTML string) initializes editor. Watched for external changes; calls `editor.commands.setContent()` when changed (skips if content matches).
- **Outbound:** tiptap's `onUpdate` callback emits both `update:modelValue` (HTML) and `update:json` (JSON) on every transaction.
- **No internal content state:** MeldEditor does not store content separately — tiptap is the single source of truth.

### Extension Resolution (merge-by-default)

```
Props                              defaults.ts                    tiptap
  |                                    |                            |
  |-- overrideExtensions? ----------->| (if provided, use ONLY these)|
  |                                    |                            |
  |  (otherwise, merge-by-default)     |                            |
  |                                    |-- createDefaultExtensions()|
  |-- defaultExtensions? ------------>|    (apply opt-outs:         |
  |   { table: false, ... }           |     skip disabled ones)     |
  |                                    |                            |
  |-- extraExtensions? -------------->|    (append to defaults)     |
  |                                    |                            |
  |-- customComponents? ------------>|    (auto-generate Node exts) |
  |                                    |                            |
  |                                    |-- final extensions ------->|
```

**Extension strategy (matches tiptap's StarterKit pattern):**
- `defaultExtensions: { table: false }` — disable individual defaults
- `extraExtensions: [MyCustomExt]` — add alongside defaults
- `overrideExtensions: [...]` — escape hatch, replaces ALL defaults

**Slash command strategy (same merge-by-default):**
- `extraSlashCommands: [...]` — add to defaults
- `disableSlashCommands: ['Table', 'Image']` — remove by title
- `overrideSlashCommands: [...]` — escape hatch, replaces ALL defaults
- `customComponents` with `slashCommand` — auto-appended to whatever list is active

---

## Extension Architecture

### Default Extensions (assembled by `defaults.ts`)

```ts
createDefaultExtensions({
  placeholder,
  slashCommands,
  onRequestImageUrl,
}) => [
  StarterKit,                           // Basic marks + nodes
  TaskList,
  TaskItem.configure({ nested: true }),
  ResizableImage.configure({ onRequestImageUrl }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Placeholder.configure({ placeholder }),
  createSlashCommandExtension(slashCommands),
]
```

### Extension Override Strategy

| Prop | Behavior |
|---|---|
| `overrideExtensions` | Use **only** these. No defaults. Full consumer control. Escape hatch. |
| `defaultExtensions` | Disable/configure individual defaults (e.g. `{ table: false }`). |
| `extraExtensions` | Additional extensions **merged** with defaults. |
| `customComponents` | Auto-generate Node extensions + slash commands, **appended** to active list. |

### Custom Node Extension Factory (Phase 2)

```
CustomComponentRegistration
  {
    name: 'meldChart',
    component: ChartNodeView,
    attrs: { chartType: { default: 'bar' }, ... },
    slashCommand: { title: 'Chart', icon: IconChartBar, ... }
  }
       |
       v
createCustomNodeExtension(registration)
       |
       v
Node.create({
  name: registration.name,
  group: 'block',
  atom: true,
  addAttributes() => registration.attrs,
  addNodeView() => VueNodeViewRenderer(WrapperComponent)
})
       |
       v
WrapperComponent
  <NodeViewWrapper>
    <registration.component v-bind="nodeViewProps" />
  </NodeViewWrapper>
```

The wrapper component forwards all `nodeViewProps` (node, editor, updateAttributes, deleteNode, selected, getPos) to the consumer's component.

---

## Theme System

### Architecture

```
Consumer App (owns theme)              MeldEditor (reacts)
       |                                     |
       |  Option A: useThemeMode()           |
       |  Option B: @nuxtjs/color-mode       |
       |  Option C: custom implementation    |
       |                                     |
       v                                     |
document.documentElement.classList            |
  .toggle('dark')                            |
       |                                     |
       v                                     v
MeldUI CSS variables (OKLCH color space)     |
  .dark { --background: ...; }              All MeldUI components +
       |                                    Tailwind classes + :deep()
       v                                    styles auto-switch
All MeldUI components auto-switch
```

**Key principle: MeldEditor does NOT own theme state.** It reacts to whatever `.dark` class is on `<html>`. The consuming app controls theme via its own system.

- **Single source of truth:** The `.dark` class on `<html>`.
- **No theme prop on MeldEditor.** No `data-theme` attribute. No internal theme state.
- **`useThemeMode()` composable** — Provided as an **optional convenience utility** (not required). Follows the doqo pattern (`/work/doqo/frontend/src/composables/useBranding.ts`):
  - 3 modes: `'auto'` | `'light'` | `'dark'`
  - `'auto'` uses `window.matchMedia('(prefers-color-scheme: dark)')` with change listener
  - Cleanup on unmount via `removeTheme()`
  - localStorage persistence
- **Consumers can use any theme system:** `@nuxtjs/color-mode`, custom composable, or manual `.dark` class toggle.

### CSS Variable Mapping

The current `notion-dark-mode.css` defines 14 custom properties for light and dark modes. All are replaced by MeldUI design tokens:

| `--notion-*` (deleted) | MeldUI token | Tailwind class |
|---|---|---|
| `--notion-bg: #ffffff` | `--background` | `bg-background` |
| `--notion-text: #37352f` | `--foreground` | `text-foreground` |
| `--notion-text-secondary: #787774` | `--muted-foreground` | `text-muted-foreground` |
| `--notion-border: #e5e5e3` | `--border` | `border-border` |
| `--notion-toolbar-bg: #ffffff` | `--muted` (50% opacity) | `bg-muted/50` |
| `--notion-hover: #f1f1ef` | `--accent` | `bg-accent` |
| `--notion-code-bg: #f7f6f3` | `--muted` | `bg-muted` |
| `--notion-selection: #d3e5ef` | `--accent` | `bg-accent` |
| `--notion-drag-handle: #c4c4c2` | `--muted-foreground` | `text-muted-foreground` |
| `--notion-slash-bg: #ffffff` | `--popover` | `bg-popover` |
| `--notion-accent: #6c63ff` | `--primary` | `text-primary` |
| `--notion-danger: #e03e3e` | `--destructive` | `text-destructive` |
| `--notion-danger-hover: rgba(...)` | `--destructive` (10% opacity) | `bg-destructive/10` |
| `--notion-slash-shadow: ...` | Tailwind shadow | `shadow-lg` |

---

## Styling Strategy

### Three styling layers

1. **Tailwind utility classes** — Layout, spacing, borders, shadows on component wrapper elements.
   ```html
   <div class="flex items-center gap-1 border-b border-border bg-muted/50 px-3 py-2 rounded-t-lg">
   ```

2. **MeldUI design tokens** — Colors, typography via CSS variables. All MeldUI components (Toggle, Button, etc.) use these internally.

3. **`:deep()` scoped styles** — ProseMirror content styles that cannot be expressed as Tailwind classes (the `.tiptap` content area, blockquotes, code blocks, table cells). These use MeldUI CSS variables:
   ```css
   :deep(.tiptap blockquote) {
     border-left: 3px solid var(--border);
     color: var(--muted-foreground);
   }
   ```

### Why `:deep()` is needed

ProseMirror generates DOM that Vue's scoped styles cannot reach. The `.tiptap` content area contains elements like `<blockquote>`, `<pre><code>`, `<table>`, `<ul>`, `<hr>` that are created by ProseMirror's schema, not Vue templates. Scoped `:deep()` selectors are the standard pattern for styling this content.

---

## Dependency Graph

```
MeldEditor.vue
  +-- types.ts                  (no deps, pure types)
  +-- defaults.ts               (depends on: types, extensions, icons)
  +-- useThemeMode.ts            (no deps)
  +-- EditorToolbar.vue         (depends on: types, MeldUI, Tabler)
  +-- TextBubbleMenu.vue        (depends on: MeldUI, Tabler, tiptap/menus)
  +-- DragHandle.vue            (depends on: Tabler, tiptap/core)
  +-- SlashCommandExtension.ts  (depends on: types, tiptap/suggestion, tippy.js)
  +-- SlashCommandList.vue      (depends on: types, MeldUI, Tabler)
  +-- defaultSlashCommands.ts   (depends on: types, Tabler)
  +-- TableControls.vue         (depends on: MeldUI, Tabler, tiptap/core)
  +-- ResizableImageExtension.ts (depends on: tiptap/extension-image, tiptap/vue-3)
  +-- ResizableImageView.vue    (depends on: MeldUI, Tabler, tiptap/vue-3)
  +-- ImageUrlDialog.vue        (depends on: MeldUI)
  +-- CustomNodeExtension.ts    (depends on: types, tiptap/core, tiptap/vue-3)  [Phase 2]
  +-- ChartNodeView.vue         (depends on: MeldUI, charts-vue, tiptap/vue-3)  [Phase 2]
```

### Independently Testable Components

These components can be developed and tested in isolation:

- `EditorToolbar` — Receives `editor` + `items[]`, renders buttons. No tiptap DOM dependency.
- `ImageUrlDialog` — Pure MeldUI dialog. No tiptap dependency.
- `SlashCommandList` — Receives `items[]` + `command()`. No tiptap dependency.
- `useThemeMode` — Pure composable. No component dependency.

These require a running tiptap editor instance:

- `TextBubbleMenu`, `DragHandle`, `TableControls`, `ResizableImageView`

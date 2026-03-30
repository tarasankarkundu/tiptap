# MeldEditor — OpenSpec

## 1. Purpose & Scope

MeldEditor is a pluggable, Notion-like rich-text editor Vue 3 component. It provides block-based editing with slash commands, drag-and-drop reordering, resizable images, tables, and dark mode — ready to drop into any Vue application.

**What it is:**
- A self-contained Vue 3 component (`<MeldEditor />`)
- Configurable via props, events, slots, and expose
- Styled with MeldUI design system (dark mode, accessible, consistent)
- Extensible with custom block types (charts, embeds, widgets)

**What it is not:**
- Not a standalone editor application — it's a component to embed in apps
- Not a collaborative editing solution (no Y.js/Hocuspocus integration)
- Not a markdown editor (it's a block editor with rich formatting)

**Target use cases:**
- Content management systems
- Note-taking applications
- Documentation tools
- Any Vue app needing rich content authoring

---

## 2. Installation & Setup

### Dependencies

```bash
pnpm add @meldui/vue @meldui/tabler-vue tailwindcss @tailwindcss/vite
pnpm add @tiptap/core @tiptap/vue-3 @tiptap/starter-kit @tiptap/pm
pnpm add @tiptap/extension-image @tiptap/extension-placeholder
pnpm add @tiptap/extension-table @tiptap/extension-table-row
pnpm add @tiptap/extension-table-header @tiptap/extension-table-cell
pnpm add @tiptap/extension-task-list @tiptap/extension-task-item
pnpm add @tiptap/extension-text-align @tiptap/suggestion tippy.js
pnpm add @tiptap/extension-table-of-contents @tiptap/extension-mention
```

For charts (Phase 2):
```bash
pnpm add @meldui/charts-vue
```

### Vite Configuration

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [tailwindcss(), vue()],
})
```

### CSS Entry Point

```css
/* src/styles/editor.css */
@import "tailwindcss";
@import "@meldui/vue/themes/default";
@source "../**/*.{vue,ts}";
```

```ts
// src/main.ts
import '@/styles/editor.css'
```

### Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MeldEditor } from '@/components/editor'

const content = ref('<p>Hello world</p>')
</script>

<template>
  <MeldEditor v-model="content" />
</template>
```

---

## 3. Component API Reference

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | `string` | `''` | HTML content for v-model two-way binding |
| **Extension control (merge-by-default)** |||
| `defaultExtensions` | `DefaultExtensionOptions` | — | Disable/configure individual default extensions |
| `extraExtensions` | `Extension[]` | — | Additional extensions merged with defaults |
| `overrideExtensions` | `Extension[]` | — | Replace ALL defaults (escape hatch) |
| **Slash commands (merge-by-default)** |||
| `extraSlashCommands` | `SlashCommandItem[]` | — | Additional commands merged with defaults |
| `disableSlashCommands` | `string[]` | — | Disable defaults by title (e.g. `['Table']`) |
| `overrideSlashCommands` | `SlashCommandItem[]` | — | Replace ALL defaults (escape hatch) |
| **Toolbar** |||
| `toolbarItems` | `ToolbarItem[]` | — | Override default toolbar items |
| **UI visibility** |||
| `showToolbar` | `boolean` | `false` | Show/hide toolbar. **Off by default** (Notion-like). |
| `showBubbleMenu` | `boolean` | `true` | Show/hide text formatting bubble menu |
| `editable` | `boolean` | `true` | Enable/disable editing (read-only / view mode) |
| `placeholder` | `string` | `'Type / for commands...'` | Placeholder text for empty editor |
| `editorClass` | `string` | `''` | Custom CSS classes for the editor outer container |
| **Image upload** |||
| `onImageUpload` | `(file: File) => Promise<string>` | — | Callback to upload image file. Returns the URL of the uploaded image. |
| **Mention** |||
| `onMentionSearch` | `(query: string) => Promise<MentionItem[]>` | — | Async callback to search mentionable items. Mention extension only loads when this is provided. |
| `customComponents` | `CustomComponentRegistration[]` | — | Register custom block types (Phase 2) |

**`DefaultExtensionOptions`:**
```ts
{
  taskList?: boolean | object    // default: true. false to disable, object to configure
  image?: boolean | object       // default: true
  table?: boolean | object       // default: true
  textAlign?: boolean | object   // default: true
  placeholder?: boolean | string // default: true. string sets placeholder text
  slashCommands?: boolean        // default: true
  mention?: boolean              // default: true (only active when onMentionSearch is provided)
}
```

### Events

| Event | Payload | Description |
|---|---|---|
| `update:modelValue` | `string` | Emitted on every content change (HTML string) |
| `update:json` | `Record<string, unknown>` | Emitted on every content change (tiptap JSON) |
| `created` | `Editor` | Emitted when the tiptap editor instance is ready |
| `focus` | `FocusEvent` | Emitted when the editor gains focus |
| `blur` | `FocusEvent` | Emitted when the editor loses focus |

### Slots

| Slot | Scoped Props | Description |
|---|---|---|
| `header` | `{ editor: Editor, editable: boolean }` | App-level action bar (Edit/Update/Close/Share buttons). Above toolbar. Consumer-controlled. |
| `toolbar` | `{ editor: Editor, items: ToolbarItem[] }` | Replace or extend the formatting toolbar |
| `bubble-menu` | `{ editor: Editor }` | Replace or extend the text bubble menu |
| `before-content` | `{ editor: Editor }` | Insert content between toolbar and editor |
| `after-content` | `{ editor: Editor }` | Insert content after the editor area |

### Expose

| Member | Type | Description |
|---|---|---|
| `editor` | `Editor \| undefined` | Raw tiptap editor instance |
| `getHTML()` | `() => string` | Get current content as HTML |
| `getJSON()` | `() => Record<string, unknown>` | Get current content as tiptap JSON |
| `setContent(content)` | `(content: string) => void` | Set content imperatively |
| `focus()` | `() => void` | Focus the editor |
| `blur()` | `() => void` | Blur the editor |

---

## 4. Default Features

Out of the box, MeldEditor includes:

### Rich Text Formatting
- Bold, Italic, Underline, Strikethrough, Inline Code
- Headings (H1, H2, H3)
- Bullet lists, Ordered lists, Task lists (with checkboxes)
- Blockquotes, Code blocks, Horizontal rules
- Text alignment (left, center, right, justify)

### Slash Commands
Type `/` to open a command menu with 15 default commands:
- Text, Heading 1/2/3
- Bullet List, Ordered List, Task List
- Blockquote, Code Block, Horizontal Rule
- Table of Contents, Table, Mention, Image
- Filter by typing after `/` (e.g., `/head`)
- Navigate with arrow keys, select with Enter
- Scrollable list with styled scrollbar (MeldUI ScrollArea)

### Images
- Insert via slash command (`/Image`) — opens a dialog with **Upload** and **Link** tabs
- **Upload tab:** Click to select or drag a file (PNG, JPG, GIF, WebP). The consuming app provides an `onImageUpload` callback to handle server upload and return the URL. Falls back to base64 if no callback provided.
- **Link tab:** Paste an image URL directly
- Resize by dragging handles on left/right edges
- Bubble menu on click: align (left/center/right), caption, download, replace, delete
- Caption support with inline editing
- Replace via bubble menu (re-opens the upload/link dialog)

### Table of Contents
- Insert via `/Table of Contents` slash command
- Auto-generated from document headings (H1, H2, H3)
- Clickable entries scroll to the corresponding heading
- Updates live as headings are added, removed, or edited
- Renders as a styled block with indentation by heading level
- Shows "No headings found" when the document has no headings

### Tables
- Insert via slash command (3x3 with header row)
- Resizable columns
- Row/column handles on hover
- Context menu: insert row/column, delete row/column, delete table

### Mentions
- Type `@` inline to trigger the mention popup
- Async search — the consuming app provides an `onMentionSearch` callback that fetches matching users/teams
- Popup shows loading spinner while searching, empty state when no results
- Keyboard navigation (arrow keys + Enter) and mouse selection
- Mentions render as styled inline chips: `@John Doe`
- Also available via `/Mention` slash command (inserts `@` to trigger the popup)
- Mention extension only loads when `onMentionSearch` prop is provided
- **Data model:** Each mention stores `{ id, label }` — the consuming app resolves additional details from the id

### Block Drag-and-Drop
- Hover over any block to see the drag handle (grip icon + plus button)
- Drag blocks to reorder
- Plus button inserts a new block and opens slash commands

### Dark Mode
- App-level dark/light mode using MeldUI's `.dark` class on `<html>`
- MeldEditor does **not** own theme state — it reacts to the consuming app's theme
- All components auto-switch via CSS variables
- Optional `useThemeMode()` composable provided as a convenience (supports auto/light/dark)

---

## 5. Configuration Examples

### Disable Specific Default Extensions

```vue
<!-- Editor without tables or task lists -->
<MeldEditor
  v-model="content"
  :default-extensions="{ table: false, taskList: false }"
/>
```

### Add Extra Extensions Alongside Defaults

```vue
<script setup>
import { Highlight } from '@tiptap/extension-highlight'
</script>

<template>
  <MeldEditor v-model="content" :extra-extensions="[Highlight]" />
</template>
```

### Mentions

```vue
<script setup>
async function searchUsers(query: string) {
  const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`)
  const users = await res.json()
  return users.map(u => ({ id: u.id, label: u.name }))
}
</script>

<template>
  <MeldEditor v-model="content" :on-mention-search="searchUsers" />
</template>
```

**How it works:**
1. User types `@` anywhere in the editor → mention popup appears
2. User types a query (e.g. `@ali`) → `onMentionSearch('ali')` is called → popup shows loading spinner
3. Callback resolves → filtered results displayed
4. User selects with arrow keys + Enter or mouse click → mention inserted as inline chip
5. Mention serializes in JSON as `{ type: "mention", attrs: { id: "user-123", label: "Alice" } }`

**`MentionItem` type:**
```ts
interface MentionItem {
  id: string    // Unique identifier (e.g. user ID)
  label: string // Display name
}
```

**Without `onMentionSearch`:** The mention extension is not loaded — no `@` trigger, no mention in slash commands.

### Disable Specific Slash Commands

```vue
<!-- Remove Table and Image from the slash menu -->
<MeldEditor
  v-model="content"
  :disable-slash-commands="['Table', 'Image']"
/>
```

### View/Edit Mode (Confluence-like)

```vue
<script setup>
import { ref } from 'vue'
import { MeldEditor } from '@/components/editor'
import { Button } from '@meldui/vue'
import { IconEdit, IconShare } from '@meldui/tabler-vue'

const content = ref('<h2>Project Plan</h2><p>Details here...</p>')
const isEditing = ref(false)
const status = ref('Saved')

async function save() {
  await api.save(content.value)
  status.value = 'Saved'
  isEditing.value = false
}
</script>

<template>
  <MeldEditor v-model="content" :editable="isEditing">
    <template #header="{ editable }">
      <div class="flex items-center justify-between px-4 py-2 border-b border-border">
        <span class="font-medium">Project Plan</span>
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">{{ status }}</span>
          <Button v-if="editable" @click="save">Update</Button>
          <Button v-if="editable" variant="ghost" @click="isEditing = false">Close</Button>
          <Button v-if="!editable" variant="ghost" @click="isEditing = true">
            <IconEdit :size="16" class="mr-1" /> Edit
          </Button>
          <Button variant="ghost">
            <IconShare :size="16" class="mr-1" /> Share
          </Button>
        </div>
      </div>
    </template>
  </MeldEditor>
</template>
```

### Enable Toolbar (opt-in)

```vue
<MeldEditor v-model="content" :show-toolbar="true" />
```

### Custom Toolbar (full slot replacement)

```vue
<MeldEditor v-model="content" :show-toolbar="true">
  <template #toolbar="{ editor }">
    <div class="flex gap-2 p-2 border-b">
      <button @click="editor.chain().focus().toggleBold().run()">Bold</button>
      <button @click="editor.chain().focus().toggleItalic().run()">Italic</button>
    </div>
  </template>
</MeldEditor>
```

### Custom Slash Commands (add to defaults)

```vue
<script setup>
import { IconStar } from '@meldui/tabler-vue'

const extraCommands = [
  {
    title: 'Callout',
    description: 'Insert a callout box',
    icon: IconStar,
    keywords: ['note', 'info', 'warning'],
    command: (editor) => {
      editor.chain().focus().insertContent({
        type: 'blockquote',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Callout text' }] }]
      }).run()
    }
  }
]
</script>

<template>
  <MeldEditor v-model="content" :extra-slash-commands="extraCommands" />
</template>
```

### Read-Only Mode

```vue
<MeldEditor :model-value="savedContent" :editable="false" />
```

### Image Upload

```vue
<script setup>
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const { url } = await res.json()
  return url
}
</script>

<template>
  <MeldEditor v-model="content" :on-image-upload="uploadImage" />
</template>
```

**How it works:**
1. User selects Image from slash command → dialog opens with **Upload** and **Link** tabs
2. **Upload tab:** User picks a file → `onImageUpload(file)` is called → your app uploads to server → returns URL → editor inserts `<img src="url">`
3. **Link tab:** User pastes a URL → editor inserts directly
4. If `onImageUpload` is not provided, file upload falls back to base64 data URL (works without a server, but not recommended for production)

The same dialog also opens when clicking **Replace** in the image bubble menu.

### v-model Binding with JSON

```vue
<script setup>
const content = ref('<h2>Hello</h2><p>World</p>')

function onJsonUpdate(json) {
  // Save JSON to database
  api.save(json)
}
</script>

<template>
  <MeldEditor v-model="content" @update:json="onJsonUpdate" />
</template>
```

### Programmatic Access

```vue
<script setup>
const editorRef = ref()

function insertImage(url) {
  editorRef.value.editor.chain().focus().setImage({ src: url }).run()
}

function saveContent() {
  const html = editorRef.value.getHTML()
  const json = editorRef.value.getJSON()
  api.save({ html, json })
}
</script>

<template>
  <MeldEditor ref="editorRef" v-model="content" />
  <button @click="saveContent">Save</button>
</template>
```

---

## 6. Extension System

### How Defaults Work (merge-by-default)

MeldEditor assembles defaults via `createDefaultExtensions()`:

- `StarterKit` (paragraphs, headings, bold, italic, underline, strike, code, lists, blockquote, code block, horizontal rule, hard break, link)
- `TaskList` + `TaskItem` (checkboxes) — disable: `{ taskList: false }`
- `ResizableImage` (block images with resize, align, caption) — disable: `{ image: false }`
- `Table` + `TableRow` + `TableHeader` + `TableCell` (resizable tables) — disable: `{ table: false }`
- `TextAlign` (paragraph and heading alignment) — disable: `{ textAlign: false }`
- `Placeholder` (configurable placeholder text) — disable: `{ placeholder: false }`
- `TableOfContents` + `TocNode` (auto-generated heading navigation) — always included
- `SlashCommandExtension` (configurable slash commands) — disable: `{ slashCommands: false }`
- `Mention` (inline @mentions with async search) — disable: `{ mention: false }`. Only active when `onMentionSearch` prop is provided.

### Overriding ALL Extensions (escape hatch)

Provide `overrideExtensions` to fully control which extensions are loaded:

```vue
<script setup>
import { StarterKit } from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'

// Minimal editor — just text, no tables/images/tasks
const extensions = [
  StarterKit,
  Placeholder.configure({ placeholder: 'Start writing...' }),
]
</script>

<template>
  <MeldEditor v-model="content" :override-extensions="extensions" />
</template>
```

### Important Notes

- **Named imports only:** tiptap v3 extensions use `import { Extension } from '@tiptap/...'`, not default imports.
- **StarterKit includes Link + Underline:** Do not install them separately.
- **BubbleMenu/FloatingMenu path:** Import from `@tiptap/vue-3/menus`, not `@tiptap/vue-3`.
- **Extensions are "initial only":** Changing the `extensions` prop after mount requires remounting the component (use `:key`).

---

## 7. Custom Components (Phase 2)

### Registration API

Register custom block types via the `customComponents` prop:

```ts
interface CustomComponentRegistration {
  name: string                    // Node type name in tiptap schema
  component: Component            // Vue component to render
  group?: string                  // 'block' (default) or 'inline'
  atom?: boolean                  // true = no editable content inside (default: true)
  inline?: boolean                // false = block node (default: false)
  draggable?: boolean             // true = can be dragged (default: true)
  slashCommand?: {                // Auto-register in slash commands
    title: string
    description: string
    icon: Component | string
    category?: string
    keywords?: string[]
    defaultAttrs?: Record<string, unknown>
  }
  attrs?: Record<string, { default: unknown }>  // Node attributes (serialized to JSON)
}
```

### Building a Custom Node Component

Custom components receive all tiptap node view props:

```vue
<!-- MyCounter.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { Button } from '@meldui/vue'

const props = defineProps(nodeViewProps)

const count = computed(() => props.node.attrs.count || 0)

function increment() {
  props.updateAttributes({ count: count.value + 1 })
}
</script>

<template>
  <NodeViewWrapper class="my-4 p-4 border rounded-lg">
    <p>Count: {{ count }}</p>
    <Button @click="increment">+1</Button>
    <Button variant="destructive" size="sm" @click="deleteNode">Remove</Button>
  </NodeViewWrapper>
</template>
```

Register it:

```vue
<MeldEditor
  v-model="content"
  :custom-components="[{
    name: 'counter',
    component: MyCounter,
    attrs: { count: { default: 0 } },
    slashCommand: {
      title: 'Counter',
      description: 'Insert a click counter',
      icon: IconPlus,
    }
  }]"
/>
```

### Chart Example

```vue
<script setup>
import { MeldEditor } from '@/components/editor'
import { chartNodeRegistration } from '@/components/editor/chart/ChartNodeExtension'

const content = ref('')
</script>

<template>
  <MeldEditor
    v-model="content"
    :custom-components="[chartNodeRegistration]"
  />
</template>
```

The chart node:
- Inserts via `/Chart` slash command
- Renders as a MeldUI chart (bar, line, pie, or area)
- Click to select, shows configure + delete buttons
- Configuration dialog to pick chart type and sample data
- Attributes (`chartType`, `config`, `height`) serialize to JSON

---

## 8. Theming

### How It Works

MeldEditor does **not** own theme state. It reacts to the `.dark` class on `<html>`:
- Dark mode is controlled by the consuming app
- All colors are CSS variables in OKLCH color space (MeldUI design tokens)
- Both MeldUI components and editor content styles auto-switch when `.dark` is toggled

### Option A: Use the provided `useThemeMode` composable

```vue
<script setup>
import { useThemeMode } from '@/components/editor'
import { Button } from '@meldui/vue'
import { IconSun, IconMoon } from '@meldui/tabler-vue'

const { mode, applyTheme, removeTheme } = useThemeMode()

onMounted(() => applyTheme('auto'))      // Follow system preference
onUnmounted(() => removeTheme())          // Cleanup listener
</script>

<template>
  <Button variant="ghost" size="icon" @click="applyTheme(mode === 'dark' ? 'light' : 'dark')">
    <IconSun v-if="mode === 'dark'" />
    <IconMoon v-else />
  </Button>
  <MeldEditor v-model="content" />
</template>
```

`useThemeMode` supports 3 modes:
- `'auto'` — follows `prefers-color-scheme` via `matchMedia` listener
- `'light'` — forces light mode
- `'dark'` — forces dark mode

### Option B: Use your app's existing theme system

If your app already manages dark mode (e.g., `@nuxtjs/color-mode`, custom composable):

```vue
<script setup>
// Your app's theme — MeldEditor just works
const isDark = ref(false)

watch(isDark, (val) => {
  document.documentElement.classList.toggle('dark', val)
})
</script>

<template>
  <MeldEditor v-model="content" />
  <!-- The editor auto-responds to the .dark class -->
</template>
```

### Customizing Colors

Override MeldUI CSS variables in your CSS:

```css
:root {
  --primary: oklch(0.55 0.2 260);       /* Custom accent color */
  --radius: 0.5rem;                      /* Border radius */
}

.dark {
  --background: oklch(0.15 0.01 260);   /* Custom dark background */
}
```

### Available Design Tokens

| Token | Usage |
|---|---|
| `--background` / `--foreground` | Main background and text |
| `--card` / `--card-foreground` | Card-like surfaces |
| `--popover` / `--popover-foreground` | Dropdowns, tooltips, menus |
| `--primary` / `--primary-foreground` | Accent color (buttons, active states) |
| `--secondary` / `--secondary-foreground` | Secondary actions |
| `--muted` / `--muted-foreground` | Subdued backgrounds and text |
| `--accent` / `--accent-foreground` | Hover and highlight states |
| `--destructive` / `--destructive-foreground` | Delete and danger actions |
| `--border` | All borders |
| `--input` | Form input borders |
| `--ring` | Focus rings |
| `--chart-1` through `--chart-5` | Chart color palette |

---

## 9. Data Model

### HTML Format

```ts
const html = editorRef.value.getHTML()
// '<h2>Title</h2><p>Paragraph with <strong>bold</strong> text.</p>'
```

### JSON Format (recommended for persistence)

```ts
const json = editorRef.value.getJSON()
```

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2, "textAlign": "left" },
      "content": [{ "type": "text", "text": "Title" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Paragraph with " },
        { "type": "text", "marks": [{ "type": "bold" }], "text": "bold" },
        { "type": "text", "text": " text." }
      ]
    }
  ]
}
```

### Mention (inline)

A mention inside a paragraph:
```json
{
  "type": "paragraph",
  "content": [
    { "type": "text", "text": "Hey " },
    { "type": "mention", "attrs": { "id": "user-123", "label": "John Doe" } },
    { "type": "text", "text": " can you review this?" }
  ]
}
```

### Table of Contents Node

```json
{
  "type": "tableOfContentsNode"
}
```

An atom node with no attributes. It auto-generates its content from the document's headings at render time. Clicking a heading entry scrolls to it.

### Image Node

```json
{
  "type": "image",
  "attrs": {
    "src": "https://example.com/photo.jpg",
    "alt": "Description",
    "width": 450,
    "align": "center",
    "caption": "Photo caption",
    "showCaption": true
  }
}
```

### Table Node

```json
{
  "type": "table",
  "content": [
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableHeader",
          "attrs": { "colspan": 1, "rowspan": 1, "colwidth": null },
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Header" }]
            }
          ]
        }
      ]
    }
  ]
}
```

### Custom Component Node (Phase 2)

```json
{
  "type": "meldChart",
  "attrs": {
    "chartType": "bar",
    "config": {
      "series": [{ "name": "Revenue", "data": [10, 20, 30] }],
      "xAxis": { "categories": ["Q1", "Q2", "Q3"] }
    },
    "height": 300
  }
}
```

### Save & Load Pattern

```ts
// Save
const json = editorRef.value.getJSON()
await api.save({ documentId, content: JSON.stringify(json) })

// Load
const saved = await api.load(documentId)
editorRef.value.setContent(JSON.parse(saved.content))
```

---

## 10. Migration Guide

### From NotionEditor to MeldEditor

| Before (NotionEditor) | After (MeldEditor) |
|---|---|
| `<NotionEditor />` | `<MeldEditor v-model="content" />` |
| Hardcoded content | Content via `modelValue` prop |
| `data-theme="dark"` on wrapper | `.dark` class on `<html>` |
| `--notion-*` CSS variables | MeldUI design tokens |
| `window.prompt` for image URL | MeldUI Dialog component |
| Inline SVG icons | `@meldui/tabler-vue` icons |
| No events | `update:modelValue`, `update:json`, `created`, `focus`, `blur` |
| No slots | `header`, `toolbar`, `bubble-menu`, `before-content`, `after-content` |
| `defineExpose({ editor })` | `editor`, `getHTML()`, `getJSON()`, `setContent()`, `focus()`, `blur()` |
| `import './notion-dark-mode.css'` | Handled by MeldUI theme (no import needed) |

### Breaking Changes

1. **CSS variables removed:** `--notion-bg`, `--notion-text`, etc. no longer exist. Use MeldUI tokens.
2. **Theme attribute removed:** `data-theme="dark"` is replaced by `.dark` class on `<html>`.
3. **No default content:** MeldEditor renders empty by default. Provide content via `modelValue`.
4. **Import path changed:** `@/components/editor` instead of `@/components/examples/NotionEditor`.

### New Dependencies

- `@meldui/vue` — UI component library
- `@meldui/tabler-vue` — Icon library
- `tailwindcss` + `@tailwindcss/vite` — CSS framework (required by MeldUI)
- `@tiptap/extension-table-of-contents` — Table of Contents extension
- `@tiptap/extension-mention` — Mention extension

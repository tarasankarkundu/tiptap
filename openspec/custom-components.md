# Custom Components — OpenSpec

## 1. Purpose & Scope

This spec defines how **custom interactive components** (Poll, Callout, and future widgets) are embedded inside MeldEditor using a **reference-based architecture**. The editor document stores only a lightweight reference ID; the component's full state lives in an external store managed by the consuming application.

**What this covers:**
- Reference-based custom component pattern (editor stores ID, not state)
- Entity store contract (how components fetch and persist state)
- Interactive Poll component — full spec
- Callout Block component — full spec
- Slash command integration for both

**What this does not cover:**
- Inline-state components (like Chart, which stores all data in node attrs) — see `openspec/meld-editor.md` Section 7
- Collaborative editing or conflict resolution
- Backend API design (the store is intentionally abstract)

**Key principle:** The editor is a **layout container** for custom components, not their data store. Components own their state lifecycle.

---

## 2. Architecture Overview

### Reference-Based Pattern (Notion Database Model)

```
Editor Document (JSON)              External Store
┌──────────────────────────┐        ┌──────────────────────────────┐
│ {                        │        │ "poll-abc123" => {           │
│   type: "interactivePoll"│ fetch  │   question: "Best framework?"│
│   attrs: {               │──────> │   options: [...],            │
│     entityId: "poll-abc" │        │   multiSelect: false,        │
│   }                      │        │   voted: ["opt-2"],          │
│ }                        │        │ }                            │
└──────────────────────────┘        └──────────────────────────────┘
```

**Contrast with inline-state pattern (Chart):**

| Aspect | Inline-State (Chart) | Reference-Based (Poll) |
|--------|---------------------|----------------------|
| Node attrs | Full state (`chartType`, `config`, `title`) | Only `{ entityId: string }` |
| State lives in | Editor document JSON | External store |
| `getJSON()` output | Contains all data | Contains only reference |
| State management | `updateAttributes()` | Store API (`updatePoll()`) |
| Rehydration | Automatic (attrs parsed) | Component fetches on mount |
| Best for | Self-contained visual widgets | Complex, independently-managed entities |

### When to Use Which Pattern

- **Inline-state** — Simple, self-contained widgets where all data fits in a flat attrs object (charts, counters, badges). Data is tightly coupled to the document.
- **Reference-based** — Complex entities with their own lifecycle, shared across documents, or managed by external systems (polls, databases, forms, embeds). Data is independent of the document.

---

## 3. Entity Store Contract

Custom components require an **entity store** — a reactive data source that components use to fetch and update their state. The store is provided by the consuming application, not by MeldEditor.

### Store Interface

```typescript
interface EntityStore<T> {
  /** Create a new entity, returns its ID */
  create(data: Omit<T, 'id'>): string

  /** Get entity by ID (reactive — triggers re-renders on change) */
  get(id: string): T | undefined

  /** Update entity fields */
  update(id: string, updates: Partial<Omit<T, 'id'>>): void

  /** Delete entity */
  delete(id: string): void
}
```

### Implementation Options

The store is intentionally abstract. Consuming applications can implement it as:

| Implementation | Persistence | Use Case |
|---------------|------------|----------|
| `reactive(new Map())` | In-memory (lost on refresh) | Demos, prototyping |
| `reactive(new Map())` + localStorage | Survives refresh | Local-first apps |
| API-backed composable | Server-persisted | Production apps |
| Pinia/Vuex store | App state management | Large Vue apps |

### Reference Implementation (in-memory)

```typescript
// usePollStore.ts
import { reactive } from 'vue'

interface PollOption {
  id: string
  text: string
  votes: number
}

interface PollEntity {
  id: string
  question: string
  options: PollOption[]
  multiSelect: boolean
  voted: string[]
}

const store = reactive(new Map<string, PollEntity>())

export function usePollStore() {
  function createPoll(data: Omit<PollEntity, 'id'>): string {
    const id = crypto.randomUUID()
    store.set(id, { ...data, id })
    return id
  }

  function getPoll(id: string): PollEntity | undefined {
    return store.get(id)
  }

  function updatePoll(id: string, updates: Partial<Omit<PollEntity, 'id'>>) {
    const poll = store.get(id)
    if (!poll) return
    Object.assign(poll, updates)
  }

  function deletePoll(id: string) {
    store.delete(id)
  }

  return { createPoll, getPoll, updatePoll, deletePoll }
}
```

---

## 4. Component Registration

Both Poll and Callout use the `CustomComponentRegistration` API (see `openspec/meld-editor.md` Section 7). The key difference: `attrs` contains only a reference ID.

### Registration Pattern

```typescript
const customComponents: CustomComponentRegistration[] = [
  {
    name: 'interactivePoll',
    component: PollNodeView,
    atom: true,
    draggable: true,
    group: 'block',
    attrs: {
      entityId: { default: null },  // null = unconfigured, triggers setup dialog
    },
    slashCommand: {
      title: 'Poll',
      description: 'Insert an interactive poll',
      icon: IconListCheck,
      keywords: ['poll', 'survey', 'vote', 'question'],
    },
    confirmDelete: true,            // Show confirmation dialog before deletion
    onDelete: (attrs) => {          // Cleanup: remove entity from external store
      if (attrs.entityId) pollStore.deletePoll(attrs.entityId as string)
    },
  },
]
```

### Insert Flow

1. User types `/poll` in the editor
2. Slash command inserts: `{ type: 'interactivePoll', attrs: { entityId: null } }`
3. Component mounts, sees `entityId === null`, opens **setup dialog**
4. User fills in question + options, clicks "Create"
5. Component calls `store.createPoll(data)` → receives `entityId`
6. Component calls `updateAttributes({ entityId })` → persists reference in editor
7. On cancel: component calls `deleteNode()` → removes the unconfigured node

This follows the same pattern as the Chart component (inserts with `chartType: null`, shows picker, deletes on cancel).

### Rehydration Flow (editor reopens)

1. Editor loads JSON containing `{ type: 'interactivePoll', attrs: { entityId: 'poll-abc123' } }`
2. Component mounts, reads `entityId` from `node.attrs`
3. Component calls `store.getPoll('poll-abc123')` → gets reactive entity data
4. Component renders the poll with full interactive state
5. If entity not found (store was cleared): shows "Poll not found" placeholder

---

## 5. Interactive Poll Component

### Overview

An interactive poll/survey widget embedded in the editor. Users can create questions with multiple options, vote, and view results — all within the document.

### Data Model

**Node attrs (editor JSON):**
```json
{
  "type": "interactivePoll",
  "attrs": {
    "entityId": "poll-abc123"
  }
}
```

**Entity (external store):**
```typescript
interface PollEntity {
  id: string                          // UUID, matches entityId in node attrs
  question: string                    // Poll question text
  options: PollOption[]               // Poll choices
  multiSelect: boolean                // Allow multiple selections
  voted: string[]                     // Current user's selected option IDs
}

interface PollOption {
  id: string                          // UUID for stable identity
  text: string                        // Option display text
  votes: number                       // Vote count
}
```

### Default State (on creation)

```typescript
{
  question: 'What do you think?',
  options: [
    { id: crypto.randomUUID(), text: 'Option 1', votes: 0 },
    { id: crypto.randomUUID(), text: 'Option 2', votes: 0 },
    { id: crypto.randomUUID(), text: 'Option 3', votes: 0 },
  ],
  multiSelect: false,
  voted: [],
}
```

### Component States

**State A: Unconfigured** (`entityId === null`)
- Setup dialog opens immediately
- Dialog fields: question text, option list (add/remove, min 2), multi-select toggle
- "Create Poll" → creates entity, persists reference
- Cancel/close → deletes the node

**State B: Entity Not Found** (`entityId` set but store returns `undefined`)
- Renders a placeholder: "Poll not found" with a delete button
- Handles the case where store was cleared (page refresh with in-memory store)

**State C: Active Poll** (entity found in store)
- Full interactive poll UI with two view modes

### UI Layout

```
┌─ Bubble Controls (when selected) ──────────────────┐
│  [Settings]  [Delete]                                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  What is your favorite framework?          [edit]    │
│                                                      │
│  ┌─ Voting Mode ──────────────────────────────────┐ │
│  │  ○  React                                      │ │
│  │  ●  Vue  ✓                                     │ │
│  │  ○  Svelte                                     │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ Results Mode (toggled) ───────────────────────┐ │
│  │  Vue      ████████████░░░░░  65%  (13 votes)   │ │
│  │  React    ██████░░░░░░░░░░░  25%  (5 votes)    │ │
│  │  Svelte   ██░░░░░░░░░░░░░░░  10%  (2 votes)   │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [+ Add option]                  [Show Results]      │
│                                                      │
│  ┌─ Settings Panel (toggled) ─────────────────────┐ │
│  │  [ ] Allow multiple selections                  │ │
│  │  Option 1: [React     ] [x]                     │ │
│  │  Option 2: [Vue       ] [x]                     │ │
│  │  Option 3: [Svelte    ] [x]                     │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Interactions

All interactions update the external store, **not** node attrs:

| Action | Behavior |
|--------|----------|
| **Vote (single-select)** | Set `voted = [optionId]`, increment votes on new option, decrement on previous |
| **Vote (multi-select)** | Toggle `optionId` in `voted` array, increment/decrement accordingly |
| **Unvote** | Click a voted option again to deselect it |
| **Add option** | Append `{ id: randomUUID(), text: 'Option N', votes: 0 }` to options |
| **Remove option** | Filter option from array (minimum 2 enforced), clean from `voted` |
| **Edit question** | Click question text → inline input, update `entity.question` on blur/Enter |
| **Edit option text** | Via settings panel, input fields for each option |
| **Toggle results** | Local `ref<boolean>` — switches between voting and results view |
| **Toggle multi-select** | Update `entity.multiSelect`, trim `voted` to 1 if switching to single |
| **Delete poll** | Calls `deleteNode()` → confirmation dialog appears (see Section 11) → on confirm, `onDelete` callback runs `store.deletePoll(entityId)` then node is removed |

### Setup Dialog

MeldUI Dialog (matches `ChartPickerDialog` pattern):

```
┌─────────────────────────────────────┐
│  Create Poll                        │
│                                     │
│  Question                           │
│  ┌─────────────────────────────┐    │
│  │ What do you think?          │    │
│  └─────────────────────────────┘    │
│                                     │
│  Options                            │
│  ┌─────────────────────────┐ [x]   │
│  │ Option 1                │        │
│  └─────────────────────────┘        │
│  ┌─────────────────────────┐ [x]   │
│  │ Option 2                │        │
│  └─────────────────────────┘        │
│  [+ Add option]                     │
│                                     │
│  [ ] Allow multiple selections      │
│                                     │
│          [Cancel]  [Create Poll]    │
└─────────────────────────────────────┘
```

### Bubble Controls

Visible when the node is selected (matches Chart bubble pattern):

- **Settings** (`IconSettings`) — toggles inline settings panel
- **Delete** (`IconTrash`, destructive styling) — removes poll and node

Positioned: `absolute -top-10 left-1/2 -translate-x-1/2` with `TooltipProvider`.

---

## 6. Callout Block Component

### Overview

A styled alert/callout block with selectable type (info, warning, success, error), a title, and **editable rich-text content inside**. This demonstrates the **container node** pattern (`atom: false`) where the component provides visual chrome around tiptap-managed content.

### Data Model

**Node attrs (editor JSON):**
```json
{
  "type": "calloutBlock",
  "attrs": {
    "entityId": "callout-def456"
  },
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "This is the callout body." }]
    }
  ]
}
```

Note: Unlike the Poll (atom node), the Callout has `content` — editable rich text managed by tiptap's ProseMirror schema.

**Entity (external store):**
```typescript
interface CalloutEntity {
  id: string
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  collapsed: boolean
}
```

The callout's rich-text body is managed by tiptap (via `NodeViewContent`), not the entity store. Only the callout's **chrome** (type, title, collapsed state) lives in the store.

### Registration

```typescript
{
  name: 'calloutBlock',
  component: CalloutNodeView,
  atom: false,                        // has editable content inside
  draggable: true,
  group: 'block',
  content: 'block+',                  // accepts block content (paragraphs, lists, etc.)
  attrs: {
    entityId: { default: null },
  },
  slashCommand: {
    title: 'Callout',
    description: 'Insert a callout block',
    icon: IconInfoCircle,
    keywords: ['callout', 'alert', 'info', 'warning', 'note'],
  },
}
```

### UI Layout

```
┌─ Callout (info) ─────────────────────────────────┐
│  ℹ️  Important Note                    [▼] [⚙] [x]│
│  ─────────────────────────────────────────────────│
│  │                                               ││
│  │  This is editable rich text inside the        ││
│  │  callout. Supports **bold**, lists, etc.      ││
│  │                                               ││
│  └───────────────────────── (NodeViewContent) ───┘│
└───────────────────────────────────────────────────┘
```

### Callout Types

| Type | Icon | Border/BG Color |
|------|------|----------------|
| `info` | `IconInfoCircle` | `border-blue-500 bg-blue-50` (dark: `bg-blue-950/30`) |
| `warning` | `IconAlertTriangle` | `border-yellow-500 bg-yellow-50` (dark: `bg-yellow-950/30`) |
| `success` | `IconCircleCheck` | `border-green-500 bg-green-50` (dark: `bg-green-950/30`) |
| `error` | `IconAlertCircle` | `border-red-500 bg-red-50` (dark: `bg-red-950/30`) |

### Interactions

| Action | Behavior |
|--------|----------|
| **Change type** | Dropdown or cycle button — updates `entity.type` |
| **Edit title** | Click title text → inline input |
| **Collapse/expand** | Toggle `entity.collapsed` — hides/shows `NodeViewContent` |
| **Edit body** | Directly type in the `NodeViewContent` area (tiptap-managed) |
| **Delete** | `store.deleteCallout(entityId)` + `deleteNode()` |

### Key Difference from Poll

The Callout uses `atom: false` with `NodeViewContent` from `@tiptap/vue-3`, meaning tiptap manages the editable content inside the callout. The component only manages the **chrome** (type badge, title bar, collapse state) via the entity store. This is the same pattern used by the Column Block (`ColumnBlockView.vue`).

---

## 7. Slash Command Integration

Both components register slash commands via `CustomComponentRegistration.slashCommand`:

```
/ Commands Menu:
  ...
  ─── Advanced ───
  📊  Chart         Insert a data chart
  📋  Poll          Insert an interactive poll
  💬  Callout       Insert a callout block
```

The auto-generated command inserts the node with `{ entityId: null }`, triggering the setup flow in each component.

---

## 8. Configuration Examples

### Register Poll Only

```vue
<script setup>
import { MeldEditor } from '@/components/editor'
import PollNodeView from '@/components/editor/poll/PollNodeView.vue'
import { IconListCheck } from '@meldui/tabler-vue'

const customComponents = [
  {
    name: 'interactivePoll',
    component: PollNodeView,
    atom: true,
    draggable: true,
    attrs: { entityId: { default: null } },
    slashCommand: {
      title: 'Poll',
      description: 'Insert an interactive poll',
      icon: IconListCheck,
      keywords: ['poll', 'survey', 'vote'],
    },
    confirmDelete: true,
    onDelete: (attrs) => {
      if (attrs.entityId) pollStore.deletePoll(attrs.entityId)
    },
  },
]
</script>

<template>
  <MeldEditor v-model="content" :custom-components="customComponents" />
</template>
```

### Register Both Poll and Callout

```vue
<script setup>
import { MeldEditor } from '@/components/editor'
import type { CustomComponentRegistration } from '@/components/editor'
import PollNodeView from '@/components/editor/poll/PollNodeView.vue'
import CalloutNodeView from '@/components/editor/callout/CalloutNodeView.vue'
import { IconListCheck, IconInfoCircle } from '@meldui/tabler-vue'

const customComponents: CustomComponentRegistration[] = [
  {
    name: 'interactivePoll',
    component: PollNodeView,
    atom: true,
    draggable: true,
    attrs: { entityId: { default: null } },
    slashCommand: {
      title: 'Poll',
      description: 'Insert an interactive poll',
      icon: IconListCheck,
      keywords: ['poll', 'survey', 'vote'],
    },
    confirmDelete: true,
    onDelete: (attrs) => {
      if (attrs.entityId) pollStore.deletePoll(attrs.entityId)
    },
  },
  {
    name: 'calloutBlock',
    component: CalloutNodeView,
    atom: false,
    draggable: true,
    attrs: { entityId: { default: null } },
    slashCommand: {
      title: 'Callout',
      description: 'Insert a callout block',
      icon: IconInfoCircle,
      keywords: ['callout', 'alert', 'info', 'warning', 'note'],
    },
    confirmDelete: true,
    onDelete: (attrs) => {
      if (attrs.entityId) calloutStore.deleteCallout(attrs.entityId)
    },
  },
]
</script>

<template>
  <MeldEditor v-model="content" :custom-components="customComponents" />
</template>
```

### Custom Store (API-backed)

```typescript
// useApiPollStore.ts — production example
export function useApiPollStore() {
  const cache = reactive(new Map<string, PollEntity>())

  async function createPoll(data: Omit<PollEntity, 'id'>): Promise<string> {
    const res = await fetch('/api/polls', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    const poll = await res.json()
    cache.set(poll.id, poll)
    return poll.id
  }

  async function getPoll(id: string): Promise<PollEntity | undefined> {
    if (cache.has(id)) return cache.get(id)
    const res = await fetch(`/api/polls/${id}`)
    if (!res.ok) return undefined
    const poll = await res.json()
    cache.set(poll.id, reactive(poll))
    return poll
  }

  // ... update, delete similarly
}
```

---

## 9. Data Model — Serialization Examples

### Poll in Editor JSON

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Team Survey" }]
    },
    {
      "type": "interactivePoll",
      "attrs": {
        "entityId": "poll-a1b2c3d4"
      }
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Please vote above!" }]
    }
  ]
}
```

### Callout in Editor JSON

```json
{
  "type": "calloutBlock",
  "attrs": {
    "entityId": "callout-e5f6g7h8"
  },
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Remember to update your dependencies before deploying." }
      ]
    }
  ]
}
```

### Multiple Polls in One Document

Each poll has its own `entityId`, pointing to independent entities in the store:

```json
{
  "type": "doc",
  "content": [
    { "type": "interactivePoll", "attrs": { "entityId": "poll-111" } },
    { "type": "paragraph", "content": [{ "type": "text", "text": "---" }] },
    { "type": "interactivePoll", "attrs": { "entityId": "poll-222" } }
  ]
}
```

---

## 10. Delete Confirmation & Entity Cleanup

### Overview

Custom components that manage external state (e.g., a Poll entity in a store) need cleanup when deleted. The `confirmDelete` and `onDelete` fields in `CustomComponentRegistration` provide this:

- `confirmDelete: true` — intercepts deletion (Backspace, Delete key, or `deleteNode()` calls) and shows a confirmation dialog before proceeding.
- `onDelete(attrs)` — called after confirmation with the node's attrs. Use it to clean up external state (e.g., `pollStore.deletePoll(attrs.entityId)`).

### Delete Confirmation Dialog

The dialog is **type-aware** — it shows the block type name and count, not generic "block" text. The display name is derived from `slashCommand.title` (if provided) or the capitalised `name`.

**Single block (button click or NodeSelection + Backspace):**

```
┌──────────────────────────────────────┐
│  Delete this Poll?                   │
│                                      │
│  This will remove the Poll block     │
│  and all its data. This action       │
│  cannot be undone.                   │
│                                      │
│              [Cancel]  [Delete]      │
└──────────────────────────────────────┘
```

**Multiple blocks, same type (range selection with 2 polls):**

```
┌──────────────────────────────────────┐
│  Delete 2 Poll blocks?               │
│                                      │
│  This will remove 2 Poll blocks      │
│  and all their data. This action     │
│  cannot be undone.                   │
│                                      │
│              [Cancel]  [Delete]      │
└──────────────────────────────────────┘
```

**Multiple blocks, multiple types (range with 2 polls + 1 callout):**

```
┌──────────────────────────────────────┐
│  Delete 3 blocks?                    │
│                                      │
│  This will remove:                   │
│  • 2 Poll blocks                     │
│  • 1 Callout block                   │
│  This action cannot be undone.       │
│                                      │
│              [Cancel]  [Delete]      │
└──────────────────────────────────────┘
```

### Cross-Type Cleanup Guarantee

When a range selection contains multiple custom node types with `confirmDelete`, a single dialog is shown listing all affected types. On confirmation, `onDelete` is called for **every** matching node in the range — not just the first — before the selection is deleted. This ensures entity cleanup happens for all blocks.

```
User selects: [paragraph] [Poll A] [Poll B] [Chart C] [paragraph]
                           ↓         ↓         ↓
Dialog shows:   "Delete 3 blocks? • 2 Poll blocks • 1 Chart block"
                           ↓         ↓         ↓
On confirm:     onDelete({entityId: "poll-a"})
                onDelete({entityId: "poll-b"})
                onDelete({entityId: "chart-c"})
                → entire selection deleted
```

Non-`confirmDelete` nodes in the selection (paragraphs, images, etc.) are deleted silently as part of the range — only `confirmDelete` nodes appear in the dialog and trigger cleanup callbacks.

### How It Works (Implementation)

Each extension with `confirmDelete: true` stores `_displayName` and `_onDelete` in its `addStorage()`. When Backspace/Delete is pressed:

1. The first extension whose type appears in the selection scans ALL nodes in the range
2. For each node, it checks `editor.extensionStorage[typeName]._displayName` — if present, that type has `confirmDelete`
3. It builds a `DeleteDialogItem[]` with counts per type and shows one dialog
4. On confirmation, it walks the range again and calls `editor.extensionStorage[typeName]._onDelete(attrs)` for each matching node
5. The full selection is then deleted

If the winning extension's type is NOT in the selection, it yields (`return false`) so the next extension in the ProseMirror handler chain gets a chance.

### DeleteDialogItem Type

```typescript
/** Used by ConfirmDeleteDialog to render type-aware messages. */
interface DeleteDialogItem {
  name: string   // Human-readable type name (e.g., "Poll", "Chart")
  count: number  // How many nodes of this type are being deleted
}
```

---

## 11. Technical Notes

### Input Focus Inside Atom Nodes

ProseMirror may steal focus from `<input>` elements inside atom nodes. Use `@mousedown.stop` on input containers to prevent this:

```html
<div @mousedown.stop>
  <Input v-model="question" />
</div>
```

### Immutable Store Updates

When modifying arrays (options, voted), always clone before mutating:

```typescript
function addOption(entityId: string) {
  const poll = store.getPoll(entityId)
  if (!poll) return
  const options = [...poll.options]
  options.push({ id: crypto.randomUUID(), text: `Option ${options.length + 1}`, votes: 0 })
  store.updatePoll(entityId, { options })
}
```

### Outside-Click Dismissal

Settings panels use the same outside-click pattern as Chart:

```typescript
function onDocumentMousedown(event: MouseEvent) {
  if (!props.selected) return
  if (containerRef.value?.contains(event.target as HTMLElement)) return
  settingsOpen.value = false
}
```

### CustomNodeExtension Factory Limitation

The `createCustomNodeExtension()` factory currently does not support the `content` field needed for container nodes (Callout). The factory will need a minor enhancement to pass `content` from the registration:

```typescript
// In CustomNodeExtension.ts — add content support
return Node.create({
  name: registration.name,
  group: registration.group ?? 'block',
  atom: registration.atom ?? true,
  content: registration.content,        // NEW: pass through content schema
  // ...
})
```

And `CustomComponentRegistration` needs an optional `content` field:

```typescript
interface CustomComponentRegistration {
  // ... existing fields
  content?: string    // ProseMirror content expression (e.g. 'block+')
}
```

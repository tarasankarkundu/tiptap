# Custom Components Architecture — Reference-Based Pattern

## System Overview

Custom components in MeldEditor follow two patterns. This document covers the **reference-based pattern** — where the editor stores a lightweight entity ID and the component manages its own state externally. For the inline-state pattern (Chart), see `docs/architecture.md`.

```
Consumer App
     |
     v
┌─────────────────────────────────────────────────────┐
│  MeldEditor                                         │
│  ┌────────────────────┐   ┌──────────────────────┐  │
│  │  Editor Document   │   │  Custom Node View    │  │
│  │  (ProseMirror)     │   │  (Vue Component)     │  │
│  │                    │   │                      │  │
│  │  { type: "poll",  │   │  PollNodeView.vue    │  │
│  │    attrs: {        │──>│  - reads entityId    │  │
│  │      entityId: ... │   │  - fetches from store│  │
│  │    }               │   │  - manages all UI    │  │
│  │  }                 │   │                      │  │
│  └────────────────────┘   └──────────┬───────────┘  │
└──────────────────────────────────────┼──────────────┘
                                       |
                                       v
                           ┌──────────────────────┐
                           │  Entity Store         │
                           │  (reactive Map)       │
                           │                       │
                           │  poll-abc => {        │
                           │    question: "...",   │
                           │    options: [...],    │
                           │    voted: [...]       │
                           │  }                    │
                           └──────────────────────┘
```

---

## Data Flow

### Insert Flow (slash command → setup → persist)

```
User types /poll
     |
     v
SlashCommandExtension
     | insertContent({ type: 'interactivePoll', attrs: { entityId: null } })
     v
PollNodeView mounts
     | entityId === null → open SetupDialog
     v
SetupDialog (user fills question + options)
     | on "Create"
     v
usePollStore().createPoll(data) → returns "poll-abc123"
     |
     v
updateAttributes({ entityId: "poll-abc123" })
     | persists reference in editor document
     v
PollNodeView re-renders with active poll
```

### Rehydration Flow (editor reopens)

```
Editor loads JSON
     | { type: 'interactivePoll', attrs: { entityId: 'poll-abc123' } }
     v
PollNodeView mounts
     | reads node.attrs.entityId
     v
usePollStore().getPoll('poll-abc123')
     |
     ├── found → render poll with full state
     └── undefined → render "Poll not found" placeholder
```

### Interaction Flow (user votes)

```
User clicks option
     |
     v
PollNodeView.vote(optionId)
     | reads current state from store
     | computes new voted[] and options[]
     v
usePollStore().updatePoll(entityId, { options, voted })
     | Vue reactivity triggers re-render
     v
PollNodeView updates (no editor transaction needed)
```

Key insight: **voting does not touch the editor document**. Only `updateAttributes()` is called once (on creation) to persist the reference. All subsequent interactions go through the store.

### Delete Flow

```
User clicks Delete
     |
     v
usePollStore().deletePoll(entityId)    ← clean up store
     |
     v
props.deleteNode()                      ← remove from editor
```

---

## Component Hierarchy

### Poll (atom node)

```
createCustomNodeExtension(registration)
  └── WrapperComponent (from factory)
       └── NodeViewWrapper
            └── PollNodeView.vue
                 ├── PollSetupDialog.vue    (shown when entityId === null)
                 ├── Bubble Controls        (shown when selected)
                 ├── Question Display       (inline-editable)
                 ├── Options List           (voting or results mode)
                 ├── Footer                 (add option, toggle results)
                 └── Settings Panel         (toggled, inline)
```

### Callout (container node)

```
createCustomNodeExtension(registration)
  └── WrapperComponent (from factory)
       └── NodeViewWrapper
            └── CalloutNodeView.vue
                 ├── Type Badge + Icon      (info/warning/success/error)
                 ├── Title Bar              (inline-editable)
                 ├── Collapse Toggle
                 └── NodeViewContent        (tiptap-managed rich text)
```

---

## Entity Store Architecture

### Design Principles

1. **Singleton per entity type** — one store composable per component type (`usePollStore`, `useCalloutStore`)
2. **Reactive Map** — Vue 3's `reactive()` on a `Map` gives fine-grained reactivity per entity
3. **Composable pattern** — accessed via `usePollStore()` inside component `setup()`
4. **No coupling to editor** — the store has no tiptap dependency; components bridge between the two

### Store Lifecycle

```
App starts
     |
     v
Store initialized (empty reactive Map)
     |
     v
User inserts /poll → SetupDialog → store.createPoll() → entity added to Map
     |
     v
Component renders, reads from store (reactive)
     |
     v
User interacts → store.updatePoll() → Vue re-renders component
     |
     v
User deletes poll → store.deletePoll() + deleteNode()
     |
     v
App closes → in-memory store lost (or persisted if localStorage-backed)
```

### Reactivity Model

```typescript
const store = reactive(new Map<string, PollEntity>())
```

- `store.get(id)` returns a **reactive object** — property access in computed/template is tracked
- `Object.assign(poll, updates)` triggers re-renders in any component reading that entity
- `store.set(id, newEntity)` triggers re-renders in components using `store.get(id)`
- `store.delete(id)` causes `store.get(id)` to return `undefined` → component shows placeholder

### Multiple Components, Same Store

```
PollNodeView (entityId: poll-111)  ──┐
                                     ├──> usePollStore() ──> reactive Map
PollNodeView (entityId: poll-222)  ──┘
```

Each component instance calls `usePollStore()` independently but gets the same singleton Map. Changes to one entity do not affect others.

---

## Factory Extension: Container Node Support

The existing `createCustomNodeExtension()` factory supports atom nodes only. The Callout Block requires a minor enhancement for container nodes.

### Current Factory (atom only)

```typescript
// CustomNodeExtension.ts
return Node.create({
  name: registration.name,
  group: registration.group ?? 'block',
  atom: registration.atom ?? true,         // ← always atom by default
  inline: registration.inline ?? false,
  draggable: registration.draggable ?? true,
  // no content field
})
```

### Enhanced Factory (atom + container)

```typescript
return Node.create({
  name: registration.name,
  group: registration.group ?? 'block',
  atom: registration.atom ?? true,
  content: registration.content,             // NEW: e.g. 'block+' for callout
  inline: registration.inline ?? false,
  draggable: registration.draggable ?? true,
})
```

```typescript
// types.ts — add content field
interface CustomComponentRegistration {
  // ... existing fields
  content?: string    // ProseMirror content expression (e.g. 'block+')
}
```

When `atom: false` and `content: 'block+'`, the node wraps editable tiptap content. The component uses `NodeViewContent` from `@tiptap/vue-3` to render it.

---

## Serialization Strategy

### What the Editor Stores

```json
{ "type": "interactivePoll", "attrs": { "entityId": "poll-abc123" } }
```

That's it. No question text, no options, no votes. The editor document is a **layout blueprint** with references.

### What the Store Holds

```typescript
Map {
  "poll-abc123" => {
    id: "poll-abc123",
    question: "Best framework?",
    options: [
      { id: "opt-1", text: "React", votes: 5 },
      { id: "opt-2", text: "Vue", votes: 13 },
      { id: "opt-3", text: "Svelte", votes: 2 },
    ],
    multiSelect: false,
    voted: ["opt-2"],
  }
}
```

### Save & Load (production pattern)

```typescript
// Save document
const docJson = editor.getJSON()
await api.saveDocument(docId, docJson)
// Entity data is saved independently by the store (API, localStorage, etc.)

// Load document
const docJson = await api.loadDocument(docId)
editor.setContent(docJson)
// Components mount, fetch entities by ID from the store
// Store may need to prefetch entities referenced in the document
```

### Prefetch Optimization

For production, the consuming app can extract entity IDs from the document JSON before setting content, then prefetch all entities in parallel:

```typescript
// Extract all entity IDs from document
function extractEntityIds(doc: any): string[] {
  const ids: string[] = []
  function walk(node: any) {
    if (node.attrs?.entityId) ids.push(node.attrs.entityId)
    node.content?.forEach(walk)
  }
  walk(doc)
  return ids
}

// Prefetch before loading
const docJson = await api.loadDocument(docId)
const ids = extractEntityIds(docJson)
await Promise.all(ids.map(id => store.prefetch(id)))
editor.setContent(docJson)
```

---

## File Structure

```
src/components/editor/
├── custom-components/
│   └── CustomNodeExtension.ts      # Factory (enhanced with content support)
├── poll/
│   ├── usePollStore.ts             # Reactive entity store (singleton)
│   ├── PollSetupDialog.vue         # Setup dialog (shown on first insert)
│   └── PollNodeView.vue            # Main node view component
├── callout/
│   ├── useCalloutStore.ts          # Reactive entity store (singleton)
│   └── CalloutNodeView.vue         # Container node view with NodeViewContent
└── types.ts                         # CustomComponentRegistration (+ content field)
```

---

## Dependency Graph

```
PollNodeView.vue
  +-- usePollStore.ts          (no external deps, pure Vue reactive)
  +-- PollSetupDialog.vue      (depends on: @meldui/vue Dialog, Input, Button)
  +-- @meldui/vue              (Button, Input, Tooltip, Dialog)
  +-- @meldui/tabler-vue       (IconSettings, IconTrash, IconPlus, IconListCheck)
  +-- vue                      (computed, ref, onMounted, onBeforeUnmount)

CalloutNodeView.vue
  +-- useCalloutStore.ts       (no external deps, pure Vue reactive)
  +-- NodeViewContent          (from @tiptap/vue-3 — renders editable content)
  +-- @meldui/vue              (Button, Tooltip)
  +-- @meldui/tabler-vue       (IconInfoCircle, IconAlertTriangle, IconCircleCheck, etc.)
  +-- vue                      (computed, ref)

Both depend on:
  +-- CustomNodeExtension.ts   (factory, wraps component in NodeViewWrapper)
  +-- types.ts                 (CustomComponentRegistration interface)
```

### No New External Dependencies

Both components use only packages already installed in the project. No additional `pnpm add` required.

---

## Comparison: Inline-State vs Reference-Based

| | Inline-State (Chart) | Reference-Based (Poll, Callout) |
|---|---|---|
| **Node attrs** | Full state | `{ entityId: string }` |
| **State source** | `node.attrs` via `updateAttributes()` | External store via `usePollStore()` |
| **Serialization** | Everything in `getJSON()` | Only reference in `getJSON()` |
| **Document size** | Grows with component data | Constant (one ID per instance) |
| **Rehydration** | Automatic (tiptap parses attrs) | Component fetches from store |
| **Cross-document sharing** | Not possible | Same entity ID in multiple docs |
| **Offline/persistence** | Built-in (part of document) | Requires store persistence strategy |
| **Best for** | Self-contained visual widgets | Complex, independently-managed entities |
| **Example** | Chart, Counter, Badge | Poll, Database, Form, Kanban |

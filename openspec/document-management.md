# Document Management — OpenSpec

## 1. Purpose & Scope

Add a document management layer around MeldEditor, enabling users to create, save, view, and edit multiple documents with localStorage persistence. The UX follows a Confluence-like pattern: sidebar for document navigation, view mode for reading, edit mode for authoring.

**What it adds:**
- Multi-document management with create, save, update, delete
- Persistent sidebar listing all documents
- View mode (read-only) and edit mode with Confluence-style header bar
- localStorage persistence (survives page refresh)
- Vue Router-based navigation with browser back/forward support
- Auto-title from document content (first heading or paragraph)

**What it does not change:**
- MeldEditor component internals remain untouched
- All behavior is driven through MeldEditor's existing props, events, and slots

---

## 2. User Flows

### 2.1 Create a Document

1. User clicks the "+" icon next to "Documents" label in the sidebar
2. A new document is created in the store with title "Untitled" and empty content
3. App navigates to `/doc/:id/edit` — the editor opens in edit mode
4. As the user types, the title auto-updates from the first heading (or first paragraph)

### 2.2 Edit a Document

1. User is on `/doc/:id/edit`
2. Header bar shows: editable title input | Save button | Close button
3. Formatting toolbar (Bold, Italic, H1, etc.) is visible
4. Bubble menu appears on text selection
5. User edits content — changes are tracked in local state (not auto-saved)
6. User clicks "Save" — title and content (tiptap JSON) are persisted to localStorage
7. User clicks "Close" — navigates to `/doc/:id` (view mode)

### 2.3 View a Document

1. User is on `/doc/:id`
2. Header bar shows: document title (read-only) | Edit button
3. Editor renders content in read-only mode — no toolbar, no bubble menu
4. User clicks "Edit" — navigates to `/doc/:id/edit`

### 2.4 Switch Between Documents

1. Sidebar lists all documents, sorted by last updated
2. Clicking a document navigates to `/doc/:id` (view mode)
3. Active document is highlighted in the sidebar

### 2.5 Delete a Document

1. User clicks the trash icon on a sidebar item
2. Confirmation dialog appears ("Delete this document?")
3. On confirm: document is removed from store and localStorage
4. If the deleted document was currently active, app redirects to `/`

---

## 3. Architecture

### 3.1 Layout

```
SidebarProvider (AppLayout)
  +-- Sidebar (DocumentSidebar)
  |     +-- Header: app title + theme toggle + SidebarTrigger
  |     +-- Content: document list + "New" action
  +-- SidebarInset
        +-- <RouterView :key="route.fullPath">
              +-- WelcomeView        (/)
              +-- DocumentViewPage   (/doc/:id)
              +-- DocumentEditPage   (/doc/:id/edit)
```

### 3.2 Routes

| Path | View | Description |
|------|------|-------------|
| `/` | `WelcomeView` | Landing page, no document selected |
| `/doc/:id` | `DocumentViewPage` | Read-only editor with view header |
| `/doc/:id/edit` | `DocumentEditPage` | Editable editor with edit header |

All doc routes pass `id` as a prop via `props: true`.

### 3.3 Content Storage Strategy

Only tiptap JSON is stored — no HTML.

**Loading content into MeldEditor:**
- Listen to the `@created` event which provides the tiptap `Editor` instance
- Call `editor.commands.setContent(doc.content)` with stored JSON directly
- Do not use `v-model`/`modelValue` for initial content loading

**Capturing content from MeldEditor:**
- Listen to `@update:json` to keep a local ref in sync with editor state
- On "Save", persist the JSON ref to the document store

**Why JSON only:**
- Lossless round-trip — JSON is tiptap's native document format
- No need for JSON-to-HTML conversion utilities
- Smaller storage footprint than storing both formats

---

## 4. Data Model

### 4.1 Document Interface

```ts
interface Document {
  id: string                         // crypto.randomUUID()
  title: string                      // User-editable, auto-derived from content
  content: Record<string, unknown>   // tiptap JSON document
  createdAt: string                  // ISO 8601
  updatedAt: string                  // ISO 8601
}
```

### 4.2 Document Store (`useDocumentStore`)

Composable following existing patterns (`usePollStore.ts` for reactive Map, `useThemeMode.ts` for localStorage).

**State:** Module-scoped singleton `reactive(new Map<string, Document>())`

**localStorage key:** `meld-documents`

**Lifecycle:**
- On first import: hydrate Map from localStorage
- On every mutation: serialize Map to localStorage (write-through)

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `createDocument` | `(title?: string) => Document` | Creates with UUID, empty JSON, returns new doc |
| `getDocument` | `(id: string) => Document \| undefined` | Lookup by ID |
| `updateDocument` | `(id: string, updates: Partial<Pick<Document, 'title' \| 'content'>>) => void` | Merge updates, set `updatedAt`, persist |
| `deleteDocument` | `(id: string) => void` | Remove from Map, persist |
| `allDocuments` | `ComputedRef<Document[]>` | All docs sorted by `updatedAt` desc |

Empty document content:
```json
{ "type": "doc", "content": [{ "type": "paragraph" }] }
```

---

## 5. Components

### 5.1 AppLayout (`src/layouts/AppLayout.vue`)

Shell layout wrapping all routes.

```
SidebarProvider
  +-- DocumentSidebar
  +-- SidebarInset
        +-- <slot />  (receives RouterView content)
```

### 5.2 DocumentSidebar (`src/components/documents/DocumentSidebar.vue`)

Uses MeldUI Sidebar component system.

**Header area:**
- App title ("MeldEditor")
- Theme toggle button (`IconSun` / `IconMoon`) using `useThemeMode()`
- `SidebarTrigger` for collapse

**Content area:**
- `SidebarGroup` with label "Documents"
- `SidebarGroupAction` with `IconFilePlus` — creates new doc + navigates to edit
- `SidebarMenu` iterating `allDocuments`:
  - `SidebarMenuItem` per doc
  - `SidebarMenuButton` with `IconFileText` + truncated title, `isActive` from route param
  - `SidebarMenuAction` with `IconTrash` — triggers delete confirmation
- Empty state message when no documents exist

**Delete confirmation:**
- `AlertDialog` from `@meldui/vue`
- If deleting the currently active document, redirect to `/`

**No footer.**

### 5.3 DocumentHeader (`src/components/documents/DocumentHeader.vue`)

Rendered via MeldEditor's `header` slot. Horizontal bar with `border-b`.

**Props:**
```ts
interface DocumentHeaderProps {
  mode: 'view' | 'edit'
  title: string
}
```

**Emits:** `save`, `close`, `edit`, `update:title`

**Edit mode layout:**
```
[  <Input> title (editable)  ] [ Save button ] [ Close button ]
```

**View mode layout:**
```
[  Title text (read-only)    ]                 [ Edit button  ]
```

**Components used:** `Button`, `Input` from `@meldui/vue`

**Icons:** `IconDeviceFloppy` (save), `IconX` (close), `IconEdit` (edit)

### 5.4 WelcomeView (`src/views/WelcomeView.vue`)

Shown at `/` when no document is selected. Centered layout with:
- Welcome heading
- Brief description
- "Create a document" button (calls `createDocument` + navigates to edit)

### 5.5 DocumentViewPage (`src/views/DocumentViewPage.vue`)

**Props:** `id: string` (from route)

**Behavior:**
1. Fetch document from store via `getDocument(id)`
2. If not found, redirect to `/`
3. On `@created` event, call `editor.commands.setContent(doc.content)`
4. Render MeldEditor with:
   - `:editable="false"`
   - `:show-toolbar="false"`
   - `:show-bubble-menu="false"`
5. Header slot: `DocumentHeader` with `mode="view"`, `:title="doc.title"`
6. On `edit` emit: `router.push({ name: 'document-edit', params: { id } })`

### 5.6 DocumentEditPage (`src/views/DocumentEditPage.vue`)

**Props:** `id: string` (from route)

**Local state:**
- `localJSON: ref` — initialized from `doc.content`
- `localTitle: ref` — initialized from `doc.title`
- `titleManuallyEdited: ref<boolean>` — tracks if user typed in title input

**Behavior:**
1. Fetch document from store; redirect to `/` if not found
2. On `@created` event, call `editor.commands.setContent(doc.content)`
3. Listen to `@update:json` → update `localJSON`
4. Render MeldEditor with:
   - `:editable="true"`
   - `:show-toolbar="true"`
   - `:custom-components="customComponents"` (from `useEditorConfig`)
   - `:on-mention-search="searchMentions"` (from `useEditorConfig`)
5. Header slot: `DocumentHeader` with `mode="edit"`, `v-model:title="localTitle"`
6. On `save` emit: `updateDocument(id, { title: localTitle, content: localJSON })`
7. On `close` emit: `router.push({ name: 'document-view', params: { id } })`
8. On `update:title` emit: set `titleManuallyEdited = true`, update `localTitle`

**Auto-title logic:**
- On each `localJSON` change, extract text from the first `heading` node in `content.content[]`
- Fallback to first `paragraph` node if no heading found
- If `!titleManuallyEdited` and extracted text is non-empty, set `localTitle` to that text
- Text extraction: walk the node's `content` array, concatenate all `text` type nodes

### 5.7 useEditorConfig (`src/composables/useEditorConfig.ts`)

Extracts shared editor configuration from current `App.vue`:
- `customComponents` array (poll registration with `PollNodeView`)
- `searchMentions(query)` async function with demo user data
- Returns `{ customComponents, searchMentions }`

---

## 6. Files Summary

### New Files (9)

| File | Purpose |
|------|---------|
| `src/composables/useDocumentStore.ts` | Document store with localStorage persistence |
| `src/composables/useEditorConfig.ts` | Shared editor config (custom components, mentions) |
| `src/router/index.ts` | Vue Router with 3 routes |
| `src/layouts/AppLayout.vue` | SidebarProvider + SidebarInset shell |
| `src/components/documents/DocumentSidebar.vue` | Document list sidebar |
| `src/components/documents/DocumentHeader.vue` | View/edit mode header bar |
| `src/views/WelcomeView.vue` | Landing page at `/` |
| `src/views/DocumentViewPage.vue` | Read-only document view |
| `src/views/DocumentEditPage.vue` | Editable document view |

### Modified Files (2)

| File | Change |
|------|--------|
| `src/main.ts` | Add router plugin registration |
| `src/App.vue` | Replace with AppLayout + RouterView |

### Package Addition (1)

| Package | Command |
|---------|---------|
| `vue-router` | `pnpm add vue-router` |

---

## 7. MeldUI Components Used

From `@meldui/vue`:
- **Sidebar:** `SidebarProvider`, `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuAction`, `SidebarRail`, `SidebarTrigger`
- **UI:** `Button`, `Input`
- **Dialog:** `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`

From `@meldui/tabler-vue`:
- `IconFilePlus`, `IconFileText`, `IconEdit`, `IconDeviceFloppy`, `IconX`, `IconTrash`, `IconSun`, `IconMoon`

---

## 8. Implementation Order

1. **Foundation:** Install vue-router, create `useDocumentStore`, create router, modify `main.ts`
2. **Layout:** Create `AppLayout`, `DocumentSidebar`, modify `App.vue`
3. **Views:** Create `DocumentHeader`, `WelcomeView`, `DocumentViewPage`, `DocumentEditPage`
4. **Config:** Create `useEditorConfig` (extract from App.vue)

---

## 9. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| JSON-only storage | Lossless round-trip, no HTML conversion needed |
| Load via `@created` + `setContent` | Avoids `modelValue` (HTML string) for JSON content |
| Module-scoped reactive Map | Singleton state shared across all components, no Pinia needed |
| localStorage write-through | Simple persistence, immediate sync on every mutation |
| `RouterView :key="route.fullPath"` | Forces remount on route change, clean editor state each time |
| Auto-title with manual override | Good UX default — users don't need to name docs upfront |
| Title managed outside editor | Document title is application-level metadata, not editor content |

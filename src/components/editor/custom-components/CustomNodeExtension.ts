import { Node, mergeAttributes, type Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { defineComponent, h, ref, onBeforeUnmount } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import type { CustomComponentRegistration, DeleteDialogItem } from '../types'
import ConfirmDeleteDialog from './ConfirmDeleteDialog.vue'

/** Context passed from the keyboard handler to the wrapper instance's dialog. */
interface ConfirmContext {
  items: DeleteDialogItem[]
  selection: { from: number; to: number } | null
}

/** Function signature for confirm-delete handlers registered by each wrapper instance. */
type ConfirmHandler = (ctx: ConfirmContext) => void

/**
 * Maps each wrapper instance's `getPos` function to its confirm-delete handler.
 * Stored in `editor.extensionStorage[name]._confirmDeleteHandlers`.
 * The `getPos` key doubles as an identity function — calling it returns the
 * current document position of that specific node instance.
 */
type HandlersMap = Map<() => number, ConfirmHandler>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtStorage = Record<string, any>

/**
 * Walks the document range and invokes `callback` for every node whose
 * extension has `_displayName` in storage (i.e. has `confirmDelete: true`).
 */
function forEachConfirmDeleteNode(
  editor: Editor,
  from: number,
  to: number,
  callback: (typeName: string, attrs: Record<string, unknown>, displayName: string) => void,
) {
  const extStorage = editor.extensionStorage as ExtStorage
  editor.state.doc.nodesBetween(from, to, (node) => {
    const storage = extStorage[node.type.name]
    if (storage?._displayName) {
      callback(node.type.name, node.attrs, storage._displayName as string)
    }
  })
}

/**
 * Factory that creates a tiptap Node extension from a `CustomComponentRegistration`.
 *
 * This is the core of the custom component system. It bridges the gap between
 * a plain Vue component and tiptap's ProseMirror-based editor by:
 *
 * 1. **Wrapping** the consumer's Vue component inside a `NodeViewWrapper` so it
 *    participates in ProseMirror's node view lifecycle (selection, dragging, etc.).
 *
 * 2. **Forwarding** all standard node-view props (`node`, `updateAttributes`,
 *    `deleteNode`, `selected`, `editor`, `getPos`, `extension`) to the component.
 *
 * 3. **Handling delete confirmation** when `registration.confirmDelete` is `true`:
 *    - Intercepts `deleteNode()` calls from the component → shows a dialog first.
 *    - Blocks Backspace/Delete at ProseMirror level → triggers the same dialog.
 *    - Supports range selections: if the user selects multiple blocks (including
 *      this node) and presses Backspace, the dialog appears and confirming it
 *      deletes the entire selection — not just this node.
 *    - **Cross-type awareness**: when a range selection spans multiple custom node
 *      types with `confirmDelete`, the dialog lists all affected types with counts
 *      and calls `onDelete` for every matched node on confirmation.
 *
 * ## Delete Confirmation Architecture
 *
 * Each extension with `confirmDelete: true` stores `_displayName` and `_onDelete`
 * in its own `addStorage()`. When Backspace/Delete is pressed, the first extension
 * whose type appears in the selection scans ALL node types by checking
 * `editor.extensionStorage[typeName]._displayName` for each node in the range.
 * This builds a complete `DeleteDialogItem[]` without needing a shared registry.
 *
 * On confirmation, `doDelete()` walks the range again and calls
 * `editor.extensionStorage[typeName]._onDelete(attrs)` for every matching node,
 * ensuring cleanup happens for ALL confirmDelete nodes — not just the first.
 */
export function createCustomNodeExtension(registration: CustomComponentRegistration) {
  const needsConfirmDelete = !!registration.confirmDelete

  /** Human-readable label derived from the registration. */
  const displayName =
    registration.slashCommand?.title ??
    registration.name.charAt(0).toUpperCase() + registration.name.slice(1)

  /**
   * Internal Vue component that wraps the consumer's component.
   * Rendered by tiptap's `VueNodeViewRenderer`.
   */
  const WrapperComponent = defineComponent({
    props: nodeViewProps,
    setup(props) {
      const confirmOpen = ref(false)
      const pendingDeleteItems = ref<DeleteDialogItem[]>([])

      /**
       * When a range selection triggers the delete, we capture the selection
       * bounds here so that confirming the dialog deletes the full range
       * (not just this single node). Null means a single-node delete.
       */
      let pendingDeleteSelection: { from: number; to: number } | null = null

      /**
       * Executes the actual delete after confirmation.
       *
       * - For range deletes: walks the range and calls `_onDelete` for every
       *   confirmDelete-registered node (looked up via extensionStorage), then
       *   replays the selection and deletes.
       * - For single-node deletes: calls `onDelete` for this node, then `deleteNode()`.
       */
      function doDelete() {
        const editor = props.editor
        if (pendingDeleteSelection) {
          const { from, to } = pendingDeleteSelection
          pendingDeleteSelection = null
          pendingDeleteItems.value = []
          // Call onDelete for EVERY confirmDelete node in the range
          const extStorage = editor.extensionStorage as ExtStorage
          forEachConfirmDeleteNode(editor, from, to, (typeName, attrs) => {
            try {
              extStorage[typeName]?._onDelete?.(attrs)
            } catch (err) {
              console.error(`[MeldEditor] onDelete failed for ${typeName}:`, err)
            }
          })
          editor.chain().focus().deleteRange({ from, to }).run()
        } else {
          pendingDeleteItems.value = []
          try {
            registration.onDelete?.(props.node.attrs)
          } catch (err) {
            console.error(`[MeldEditor] onDelete failed for ${registration.name}:`, err)
          }
          props.deleteNode()
        }
      }

      /**
       * Replacement for `deleteNode` passed to the consumer component.
       * If `confirmDelete` is enabled, opens the dialog instead of deleting.
       * Otherwise calls `onDelete` for cleanup and deletes immediately.
       */
      function wrappedDeleteNode() {
        if (needsConfirmDelete) {
          pendingDeleteSelection = null
          pendingDeleteItems.value = [{ name: displayName, count: 1 }]
          confirmOpen.value = true
        } else {
          registration.onDelete?.(props.node.attrs)
          props.deleteNode()
        }
      }

      /**
       * Invoked by the extension's `addKeyboardShortcuts` handler (via editor
       * storage) when the user presses Backspace/Delete and this node is in
       * the selection. Receives the full cross-type context.
       */
      function onKeyboardDelete(ctx: ConfirmContext) {
        pendingDeleteSelection = ctx.selection
        pendingDeleteItems.value = ctx.items
        confirmOpen.value = true
      }

      // Register this instance's keyboard-delete handler in editor storage
      // so `addKeyboardShortcuts` can find and invoke it by position.
      if (needsConfirmDelete) {
        const getPos = props.getPos as () => number
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storage = (props.editor.extensionStorage as any)[registration.name]
        const handlers = storage!._confirmDeleteHandlers as HandlersMap
        handlers.set(getPos, onKeyboardDelete)

        onBeforeUnmount(() => {
          handlers.delete(getPos)
        })
      }

      return () => [
        h(NodeViewWrapper, { class: 'custom-node-wrapper' }, () =>
          h(registration.component, {
            node: props.node,
            updateAttributes: props.updateAttributes,
            deleteNode: wrappedDeleteNode,
            selected: props.selected,
            editor: props.editor,
            getPos: props.getPos,
            extension: props.extension,
          }),
        ),
        needsConfirmDelete
          ? h(ConfirmDeleteDialog, {
              open: confirmOpen.value,
              items: pendingDeleteItems.value,
              'onUpdate:open': (val: boolean) => {
                confirmOpen.value = val
                if (!val) {
                  pendingDeleteSelection = null
                  pendingDeleteItems.value = []
                }
              },
              onConfirm: doDelete,
            })
          : null,
      ]
    },
  })

  const nodeTypeName = registration.name

  return Node.create({
    name: nodeTypeName,
    group: registration.group ?? 'block',
    atom: registration.atom ?? true,
    inline: registration.inline ?? false,
    draggable: registration.draggable ?? true,

    /**
     * Editor storage for this extension.
     * - `_confirmDeleteHandlers`: maps each active wrapper instance (by `getPos`)
     *   to its confirm-delete handler.
     * - `_displayName`: human-readable label for this block type.
     * - `_onDelete`: cleanup callback, looked up by sibling extensions during
     *   cross-type range deletes.
     */
    addStorage() {
      return {
        _confirmDeleteHandlers: new Map() as HandlersMap,
        _displayName: needsConfirmDelete ? displayName : null,
        _onDelete: needsConfirmDelete ? (registration.onDelete ?? null) : null,
      }
    },

    addAttributes() {
      return registration.attrs ?? {}
    },

    parseHTML() {
      return [{ tag: `div[data-type="${nodeTypeName}"]` }]
    },

    renderHTML({ HTMLAttributes }) {
      return [
        'div',
        mergeAttributes(HTMLAttributes, { 'data-type': nodeTypeName }),
      ]
    },

    addNodeView() {
      return VueNodeViewRenderer(WrapperComponent)
    },

    /**
     * Keyboard shortcut overrides for Backspace and Delete.
     *
     * When `confirmDelete` is false: returns `false` (ProseMirror handles normally).
     *
     * When `confirmDelete` is true: scans the full selection for ALL custom node
     * types with `confirmDelete` (identified by `_displayName` in their storage).
     * If this extension's own type is in the selection, it builds a complete
     * `DeleteDialogItem[]` and triggers one of its wrapper instances' dialogs.
     * If this type is NOT in the selection, returns `false` so the next extension
     * in the handler chain gets a chance.
     */
    addKeyboardShortcuts() {
      const typeName = nodeTypeName
      if (!needsConfirmDelete) {
        return {
          Backspace: () => false,
          Delete: () => false,
        }
      }

      const triggerConfirm = (editor: Editor): boolean => {
        const { selection } = editor.state
        const isNodeSel = selection instanceof NodeSelection

        // Determine scan range
        const from = selection.from
        const to = isNodeSel ? from + selection.node.nodeSize : selection.to

        // Collect all confirmDelete node types in the selection
        const typeCountMap = new Map<string, { displayName: string; count: number }>()
        forEachConfirmDeleteNode(editor, from, to, (typeName, _attrs, displayName) => {
          const existing = typeCountMap.get(typeName)
          typeCountMap.set(typeName, {
            displayName,
            count: (existing?.count ?? 0) + 1,
          })
        })

        if (typeCountMap.size === 0) return false

        // If this extension's type isn't in the selection, yield to the next handler
        if (!typeCountMap.has(typeName)) return false

        // Build items list from all matched types
        const items: DeleteDialogItem[] = Array.from(typeCountMap.values()).map(
          ({ displayName, count }) => ({ name: displayName, count }),
        )

        const selectionCtx = isNodeSel ? null : { from: selection.from, to: selection.to }

        // Find a handler from this extension's instances within the selection range
        const handlers = this.storage._confirmDeleteHandlers as HandlersMap
        for (const [getPos, handler] of handlers) {
          const pos = getPos()
          if (pos >= from && pos < to) {
            handler({ items, selection: selectionCtx })
            return true
          }
        }

        // No handler found — yield so the next extension can try
        return false
      }

      return {
        Backspace: ({ editor }) => triggerConfirm(editor),
        Delete: ({ editor }) => triggerConfirm(editor),
      }
    },
  })
}

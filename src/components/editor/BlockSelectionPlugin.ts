import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorView } from '@tiptap/pm/view'
import type { Node as PmNode } from '@tiptap/pm/model'

const pluginKey = new PluginKey('blockSelection')

/** Persisted block selection — indices of selected top-level blocks (inclusive). */
interface BlockRange {
  low: number
  high: number
}

/** Find the index of the top-level block at a document position. */
function topBlockIndex(doc: PmNode, pos: number): number {
  const $pos = doc.resolve(pos)
  if ($pos.depth === 0) {
    return Math.min($pos.index(0), doc.childCount - 1)
  }
  return $pos.index(0)
}

/**
 * Get the document position range [from, to) for top-level blocks
 * between indices low..high (inclusive).
 */
function posRangeForBlocks(doc: PmNode, low: number, high: number): { from: number; to: number } {
  let from = 0
  let to = 0
  let i = 0
  doc.forEach((node, pos) => {
    if (i === low) from = pos
    if (i === high) to = pos + node.nodeSize
    i++
  })
  return { from, to }
}

/** Build decorations for blocks between indices low..high (inclusive). */
function decorationsForRange(doc: PmNode, low: number, high: number): DecorationSet {
  const decorations: Decoration[] = []
  let i = 0
  doc.forEach((node, pos) => {
    if (i >= low && i <= high) {
      decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: 'block-selected' }))
    }
    i++
  })
  if (decorations.length <= 1) return DecorationSet.empty
  return DecorationSet.create(doc, decorations)
}

/**
 * Notion-like block selection highlights.
 *
 * ## How it works
 *
 * Tracks mouse drags to detect when the user crosses block boundaries —
 * even across atom nodes (images, polls, charts) where ProseMirror can't
 * create a native text selection. Renders a semi-transparent overlay on
 * every block in the range.
 *
 * The block selection is independent of ProseMirror's selection system.
 * Backspace/Delete are handled directly by the extension — it deletes the
 * document range covering the selected blocks, bypassing TextSelection
 * entirely. This avoids issues with atom-only ranges where TextSelection
 * can't find valid cursor positions.
 *
 * ## Lifecycle
 *
 * 1. mousedown — record anchor block, clear any existing block selection
 * 2. mousemove — if mouse crosses a block boundary, activate block selection
 * 3. mouseup — "commit" the selection (it persists in plugin state)
 * 4. Backspace/Delete — delete the block range, clear state
 * 5. Any click or Escape — clear state
 *
 * Also renders highlights for keyboard selections (Shift+Arrow) that span
 * multiple blocks, using ProseMirror's selection range as a fallback.
 */
export const BlockSelection = Extension.create({
  name: 'blockSelection',

  addKeyboardShortcuts() {
    /** Check if a block selection is active (drag-based or selection-based). */
    const hasBlockSelection = (): boolean => {
      const state = this.editor.state
      if (pluginKey.getState(state)) return true
      // Fallback: check if ProseMirror selection spans 2+ blocks
      const { from, to } = state.selection
      if (from === to) return false
      let count = 0
      state.doc.forEach((node, pos) => {
        const end = pos + node.nodeSize
        if (pos < to && end > from) count++
      })
      return count > 1
    }

    const deleteBlockSelection = (): boolean => {
      const state = this.editor.state
      const range = pluginKey.getState(state) as BlockRange | null
      if (!range) return false

      const { from, to } = posRangeForBlocks(state.doc, range.low, range.high)

      // Check if any confirmDelete nodes are in the range.
      // If so, trigger their confirmation handler instead of deleting directly.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extStorage = this.editor.extensionStorage as Record<string, any>
      const typeCounts = new Map<string, number>()
      state.doc.nodesBetween(from, to, (node) => {
        const stor = extStorage[node.type.name]
        if (stor?._displayName) {
          typeCounts.set(node.type.name, (typeCounts.get(node.type.name) ?? 0) + 1)
        }
      })

      if (typeCounts.size > 0) {
        // Build items list for the confirm dialog
        const items = Array.from(typeCounts.entries()).map(([name, count]) => ({
          name: extStorage[name]._displayName as string,
          count,
        }))

        // Find a handler from any confirmDelete extension in the range
        for (const [typeName] of typeCounts) {
          const handlers = extStorage[typeName]?._confirmDeleteHandlers
          if (handlers) {
            for (const [, handler] of handlers) {
              handler({ items, selection: { from, to } })
              // Clear the block selection state — the confirm dialog takes over
              this.editor.view.dispatch(state.tr.setMeta(pluginKey, null))
              return true
            }
          }
        }
      }

      // No confirmDelete nodes — delete directly
      this.editor.chain().focus().deleteRange({ from, to }).run()
      return true
    }

    const clearBlockSelection = (): boolean => {
      if (!hasBlockSelection()) return false
      const state = this.editor.state
      const tr = state.tr.setMeta(pluginKey, null)
      // Collapse ProseMirror selection to deactivate fallback decorations
      tr.setSelection(TextSelection.create(state.doc, state.selection.from))
      this.editor.view.dispatch(tr)
      return true
    }

    return {
      Backspace: () => deleteBlockSelection(),
      Delete: () => deleteBlockSelection(),
      Escape: () => clearBlockSelection(),
    }
  },

  addProseMirrorPlugins() {
    /** Block index where the current mousedown started. */
    let dragAnchor: number | null = null
    /** Whether we're actively in a cross-block drag. */
    let isDragging = false

    return [
      new Plugin({
        key: pluginKey,

        state: {
          init: (): BlockRange | null => null,
          apply(tr, prev) {
            const meta = tr.getMeta(pluginKey)
            if (meta !== undefined) return meta as BlockRange | null
            // Reset on doc changes to avoid stale indices
            if (tr.docChanged) return null
            return prev
          },
        },

        props: {
          decorations(state) {
            const range = pluginKey.getState(state) as BlockRange | null

            // 1. Active block selection (from drag or committed)
            if (range) {
              return decorationsForRange(state.doc, range.low, range.high)
            }

            // 2. Fallback: keyboard / programmatic selections spanning multiple blocks
            const { from, to } = state.selection
            if (from === to) return DecorationSet.empty

            const decorations: Decoration[] = []
            state.doc.forEach((node, pos) => {
              const nodeEnd = pos + node.nodeSize
              if (pos < to && nodeEnd > from) {
                decorations.push(
                  Decoration.node(pos, nodeEnd, { class: 'block-selected' }),
                )
              }
            })

            if (decorations.length <= 1) return DecorationSet.empty
            return DecorationSet.create(state.doc, decorations)
          },

          handleDOMEvents: {
            mousedown(view: EditorView, event: MouseEvent) {
              if (event.button !== 0) return false

              // Clear any committed block selection on new click
              const prev = pluginKey.getState(view.state) as BlockRange | null
              if (prev) {
                view.dispatch(view.state.tr.setMeta(pluginKey, null))
              }

              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
              if (!pos) return false

              dragAnchor = topBlockIndex(view.state.doc, pos.pos)
              isDragging = false

              return false // let ProseMirror handle the click normally
            },

            mousemove(view: EditorView, event: MouseEvent) {
              if (dragAnchor === null) return false

              // Button released outside the editor
              if (!(event.buttons & 1)) {
                dragAnchor = null
                isDragging = false
                return false
              }

              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
              let headIndex: number
              if (pos) {
                headIndex = topBlockIndex(view.state.doc, pos.pos)
              } else {
                // Mouse is outside editor bounds — clamp to first or last block
                const editorRect = view.dom.getBoundingClientRect()
                headIndex = event.clientY < editorRect.top
                  ? 0
                  : view.state.doc.childCount - 1
              }
              const low = Math.min(dragAnchor, headIndex)
              const high = Math.max(dragAnchor, headIndex)

              // Same block as anchor — not a cross-block drag
              if (low === high) {
                if (isDragging) {
                  // Was dragging across blocks, now back to single — clear
                  isDragging = false
                  view.dispatch(view.state.tr.setMeta(pluginKey, null))
                }
                return false
              }

              // Check if the range actually changed
              const current = pluginKey.getState(view.state) as BlockRange | null
              if (current && current.low === low && current.high === high) {
                return true // range unchanged, just block default behavior
              }

              isDragging = true
              view.dispatch(view.state.tr.setMeta(pluginKey, { low, high } as BlockRange))
              return true // prevent ProseMirror's default drag / selection
            },

            mouseup(view: EditorView) {
              const wasDragging = isDragging
              dragAnchor = null
              isDragging = false

              // Block selection stays committed in plugin state (not cleared).
              // It will be cleared by: next mousedown, Escape, doc change,
              // or Backspace/Delete (which deletes the blocks).

              return wasDragging
            },
          },
        },
      }),
    ]
  },
})

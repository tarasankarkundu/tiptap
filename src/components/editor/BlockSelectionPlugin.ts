import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PmNode } from '@tiptap/pm/model'

export const blockSelectionKey = new PluginKey('blockSelection')

/** Persisted block selection — indices of selected top-level blocks (inclusive). */
export interface BlockRange {
  low: number
  high: number
}

/** Find the index of the top-level block at a document position. */
export function topBlockIndex(doc: PmNode, pos: number): number {
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
export function posRangeForBlocks(doc: PmNode, low: number, high: number): { from: number; to: number } {
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
 * Notion-like block selection.
 *
 * State management, decorations, and keyboard shortcuts live here.
 * Mouse handling is in MeldEditor.vue so it works from anywhere on screen.
 */
export const BlockSelection = Extension.create({
  name: 'blockSelection',

  addKeyboardShortcuts() {
    const hasBlockSelection = (): boolean => {
      const state = this.editor.state
      if (blockSelectionKey.getState(state)) return true
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
      const range = blockSelectionKey.getState(state) as BlockRange | null
      if (!range) return false

      const { from, to } = posRangeForBlocks(state.doc, range.low, range.high)

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
        const items = Array.from(typeCounts.entries()).map(([name, count]) => ({
          name: extStorage[name]._displayName as string,
          count,
        }))

        for (const [typeName] of typeCounts) {
          const handlers = extStorage[typeName]?._confirmDeleteHandlers
          if (handlers) {
            for (const [, handler] of handlers) {
              handler({ items, selection: { from, to } })
              this.editor.view.dispatch(state.tr.setMeta(blockSelectionKey, null))
              return true
            }
          }
        }
      }

      this.editor.chain().focus().deleteRange({ from, to }).run()
      return true
    }

    const clearBlockSelection = (): boolean => {
      if (!hasBlockSelection()) return false
      const state = this.editor.state
      const tr = state.tr.setMeta(blockSelectionKey, null)
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
    return [
      new Plugin({
        key: blockSelectionKey,

        state: {
          init: (): BlockRange | null => null,
          apply(tr, prev) {
            const meta = tr.getMeta(blockSelectionKey)
            if (meta !== undefined) return meta as BlockRange | null
            if (tr.docChanged) return null
            return prev
          },
        },

        props: {
          decorations(state) {
            const range = blockSelectionKey.getState(state) as BlockRange | null

            if (range) {
              return decorationsForRange(state.doc, range.low, range.high)
            }

            // Fallback: keyboard selections spanning multiple blocks
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
        },
      }),
    ]
  },
})

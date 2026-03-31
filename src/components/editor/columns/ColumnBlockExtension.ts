import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ColumnBlockView from './ColumnBlockView.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columnBlock: {
      setColumns: (count: number) => ReturnType
      addColumn: () => ReturnType
      removeColumn: () => ReturnType
      unsetColumns: () => ReturnType
    }
  }
}

function buildColumn(schema: { nodes: Record<string, any> }) {
  return schema.nodes.column!.create(null, schema.nodes.paragraph!.create())
}

export const ColumnBlockExtension = Node.create({
  name: 'columnBlock',
  group: 'block',
  content: 'column{2,}',
  isolating: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      columns: { default: 2 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'column-block', class: 'column-block' }),
      0,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(ColumnBlockView)
  },

  addCommands() {
    return {
      setColumns:
        (count: number) =>
        ({ tr, state, dispatch }) => {
          const { schema } = state
          const columns = Array.from({ length: count }, () => buildColumn(schema))
          const columnBlock = schema.nodes.columnBlock!.create({ columns: count }, columns)
          if (dispatch) {
            const pos = tr.selection.from
            tr.replaceSelectionWith(columnBlock)
            // The columnBlock was inserted at `pos`. Walk into it to find the
            // first valid text position (first column > paragraph).
            // After replaceSelectionWith, the node starts at the mapped `pos`.
            // Resolve pos+1 to get inside the columnBlock, then use TextSelection.near
            // to find the first valid cursor position (which is the first column's paragraph).
            const $start = tr.doc.resolve(pos + 1)
            tr.setSelection(TextSelection.near($start))
            dispatch(tr)
          }
          return true
        },

      addColumn:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection, schema } = state
          const pos = selection.$from

          // Find the columnBlock ancestor
          for (let d = pos.depth; d > 0; d--) {
            const node = pos.node(d)
            if (node.type.name === 'columnBlock') {
              if (node.childCount >= 3) return false // max 3

              const newColumn = buildColumn(schema)
              const insertPos = pos.before(d) + node.nodeSize - 1 // before closing tag
              if (dispatch) {
                tr.insert(insertPos, newColumn)
                tr.setNodeMarkup(pos.before(d), undefined, { columns: node.childCount + 1 })
                dispatch(tr)
              }
              return true
            }
          }
          return false
        },

      removeColumn:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const pos = selection.$from

          for (let d = pos.depth; d > 0; d--) {
            const node = pos.node(d)
            if (node.type.name === 'columnBlock') {
              if (node.childCount <= 2) return false // min 2

              // Remove the last column
              const blockStart = pos.before(d)
              let lastColumnStart = blockStart + 1
              for (let i = 0; i < node.childCount - 1; i++) {
                lastColumnStart += node.child(i).nodeSize
              }
              const lastColumn = node.child(node.childCount - 1)

              if (dispatch) {
                tr.delete(lastColumnStart, lastColumnStart + lastColumn.nodeSize)
                tr.setNodeMarkup(blockStart, undefined, { columns: node.childCount - 1 })
                dispatch(tr)
              }
              return true
            }
          }
          return false
        },

      unsetColumns:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const pos = selection.$from

          for (let d = pos.depth; d > 0; d--) {
            const node = pos.node(d)
            if (node.type.name === 'columnBlock') {
              // Collect all content from all columns
              const blocks: ProseMirrorNode[] = []
              node.forEach((column) => {
                column.forEach((block) => {
                  if (block.content.size > 0) {
                    blocks.push(block)
                  }
                })
              })

              const blockStart = pos.before(d)
              const blockEnd = blockStart + node.nodeSize

              if (dispatch) {
                tr.delete(blockStart, blockEnd)
                // Insert collected blocks at the position where columnBlock was
                blocks.reverse().forEach((block) => {
                  tr.insert(blockStart, block)
                })
                dispatch(tr)
              }
              return true
            }
          }
          return false
        },
    }
  },
})

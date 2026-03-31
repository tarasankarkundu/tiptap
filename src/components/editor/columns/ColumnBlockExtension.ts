import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model'
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

function findColumnBlock($pos: ResolvedPos): { node: ProseMirrorNode; depth: number; pos: number } | null {
  for (let d = $pos.depth; d > 0; d--) {
    const node = $pos.node(d)
    if (node.type.name === 'columnBlock') {
      return { node, depth: d, pos: $pos.before(d) }
    }
  }
  return null
}

export const ColumnBlockExtension = Node.create({
  name: 'columnBlock',
  group: 'block',
  content: 'column{2,}',
  isolating: true,
  selectable: true,
  draggable: true,

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
          const columnBlock = schema.nodes.columnBlock!.create(null, columns)
          if (dispatch) {
            const pos = tr.selection.from
            tr.replaceSelectionWith(columnBlock)
            tr.setSelection(TextSelection.near(tr.doc.resolve(pos + 1)))
            dispatch(tr)
          }
          return true
        },

      addColumn:
        () =>
        ({ tr, state, dispatch }) => {
          const found = findColumnBlock(state.selection.$from)
          if (!found || found.node.childCount >= 3) return false

          if (dispatch) {
            const insertPos = found.pos + found.node.nodeSize - 1
            tr.insert(insertPos, buildColumn(state.schema))
            dispatch(tr)
          }
          return true
        },

      removeColumn:
        () =>
        ({ tr, state, dispatch }) => {
          const found = findColumnBlock(state.selection.$from)
          if (!found || found.node.childCount <= 2) return false

          if (dispatch) {
            let lastColumnStart = found.pos + 1
            for (let i = 0; i < found.node.childCount - 1; i++) {
              lastColumnStart += found.node.child(i).nodeSize
            }
            const lastColumn = found.node.child(found.node.childCount - 1)
            tr.delete(lastColumnStart, lastColumnStart + lastColumn.nodeSize)
            dispatch(tr)
          }
          return true
        },

      unsetColumns:
        () =>
        ({ tr, state, dispatch }) => {
          const found = findColumnBlock(state.selection.$from)
          if (!found) return false

          const blocks: ProseMirrorNode[] = []
          found.node.forEach((column) => {
            column.forEach((block) => {
              if (block.content.size > 0) blocks.push(block)
            })
          })

          if (dispatch) {
            const blockEnd = found.pos + found.node.nodeSize
            tr.delete(found.pos, blockEnd)
            blocks.reverse().forEach((block) => tr.insert(found.pos, block))
            dispatch(tr)
          }
          return true
        },
    }
  },
})

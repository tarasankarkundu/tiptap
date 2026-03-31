import { Node, mergeAttributes } from '@tiptap/core'

export const ColumnExtension = Node.create({
  name: 'column',
  group: 'column',
  content: 'block+',
  isolating: true,
  selectable: false,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'column' }), 0]
  },
})

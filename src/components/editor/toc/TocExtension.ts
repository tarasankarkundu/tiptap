import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TocNodeView from './TocNodeView.vue'

export const TocNode = Node.create({
  name: 'tableOfContentsNode',
  group: 'block',
  atom: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="toc"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toc' }), 'Table of Contents']
  },

  addNodeView() {
    return VueNodeViewRenderer(TocNodeView)
  },
})

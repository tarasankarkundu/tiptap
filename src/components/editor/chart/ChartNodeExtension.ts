import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ChartNodeView from './ChartNodeView.vue'

export const ChartNode = Node.create({
  name: 'meldChart',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      chartType: { default: null },  // null = unconfigured, show picker
      config: { default: null },
      title: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="meld-chart"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'meld-chart' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(ChartNodeView)
  },
})

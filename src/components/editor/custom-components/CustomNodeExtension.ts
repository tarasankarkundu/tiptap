import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { defineComponent, h } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import type { CustomComponentRegistration } from '../types'

export function createCustomNodeExtension(registration: CustomComponentRegistration) {
  const WrapperComponent = defineComponent({
    props: nodeViewProps,
    setup(props) {
      return () =>
        h(NodeViewWrapper, { class: 'custom-node-wrapper' }, () =>
          h(registration.component, {
            node: props.node,
            updateAttributes: props.updateAttributes,
            deleteNode: props.deleteNode,
            selected: props.selected,
            editor: props.editor,
            getPos: props.getPos,
            extension: props.extension,
          }),
        )
    },
  })

  return Node.create({
    name: registration.name,
    group: registration.group ?? 'block',
    atom: registration.atom ?? true,
    inline: registration.inline ?? false,
    draggable: registration.draggable ?? true,

    addAttributes() {
      return registration.attrs ?? {}
    },

    parseHTML() {
      return [{ tag: `div[data-type="${registration.name}"]` }]
    },

    renderHTML({ HTMLAttributes }) {
      return [
        'div',
        mergeAttributes(HTMLAttributes, { 'data-type': registration.name }),
      ]
    },

    addNodeView() {
      return VueNodeViewRenderer(WrapperComponent)
    },
  })
}

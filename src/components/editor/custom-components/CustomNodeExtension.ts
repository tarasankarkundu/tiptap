import { Node, mergeAttributes, type Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
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
            confirmDelete: !!registration.confirmDelete,
          }),
        )
    },
  })

  const nodeTypeName = registration.name

  return Node.create({
    name: nodeTypeName,
    group: registration.group ?? 'block',
    atom: registration.atom ?? true,
    inline: registration.inline ?? false,
    draggable: registration.draggable ?? true,

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

    // Block Backspace/Delete when this node would be deleted — covers both
    // single NodeSelection and range selections that include this node type.
    addKeyboardShortcuts() {
      const blockKeyDelete = !!registration.confirmDelete
      const typeName = nodeTypeName

      const selectionContainsThisNode = (editor: Editor) => {
        const { selection } = editor.state
        // Single node selection
        if (selection instanceof NodeSelection) {
          return selection.node.type.name === typeName
        }
        // Range selection — check if any node of this type is within the range
        let found = false
        editor.state.doc.nodesBetween(selection.from, selection.to, (node) => {
          if (node.type.name === typeName) found = true
        })
        return found
      }

      return {
        Backspace: ({ editor }) => {
          if (!blockKeyDelete) return false
          return selectionContainsThisNode(editor)
        },
        Delete: ({ editor }) => {
          if (!blockKeyDelete) return false
          return selectionContainsThisNode(editor)
        },
      }
    },
  })
}

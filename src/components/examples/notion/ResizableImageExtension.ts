import { Image } from '@tiptap/extension-image'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ResizableImageView from './ResizableImageView.vue'

export const ResizableImage = Image.extend({
  addOptions() {
    return {
      ...(this.parent?.() ?? {}),
      inline: false,
      allowBase64: true,
    } as ReturnType<NonNullable<typeof this.parent>>
  },

  inline() {
    return false
  },

  group() {
    return 'block'
  },

  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      align: { default: 'center' },
      caption: { default: '' },
      showCaption: { default: false },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ResizableImageView)
  },
})

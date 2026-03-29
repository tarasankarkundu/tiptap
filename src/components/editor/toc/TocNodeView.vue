<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'

interface TocItem {
  id: string
  level: number
  textContent: string
  isActive: boolean
  dom: HTMLElement
}

const props = defineProps(nodeViewProps)

const items = ref<TocItem[]>([])

function updateItems() {
  const tocExtension = props.editor.extensionManager.extensions.find(
    (ext) => ext.name === 'tableOfContents',
  )
  if (tocExtension) {
    items.value = props.editor.storage.tableOfContents?.content ?? []
  }
}

function scrollToHeading(item: TocItem) {
  const element = item.dom
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

let off: (() => void) | null = null

onMounted(() => {
  updateItems()
  const handler = () => updateItems()
  props.editor.on('update', handler)
  off = () => props.editor.off('update', handler)
})

onBeforeUnmount(() => {
  off?.()
})
</script>

<template>
  <NodeViewWrapper class="my-4">
    <div
      class="rounded-lg border border-border bg-muted/30 p-4"
      :class="{ 'ring-2 ring-primary/20': selected }"
    >
      <h4 class="text-sm font-semibold text-foreground mb-3">Table of Contents</h4>
      <nav v-if="items.length">
        <ul class="space-y-1">
          <li
            v-for="item in items"
            :key="item.id"
            :style="{ paddingLeft: `${(item.level - 1) * 1}rem` }"
          >
            <button
              class="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-0 bg-transparent p-0 text-left"
              :class="{ 'text-foreground font-medium': item.isActive }"
              @click="scrollToHeading(item)"
            >
              {{ item.textContent }}
            </button>
          </li>
        </ul>
      </nav>
      <p v-else class="text-sm text-muted-foreground italic">
        No headings found. Add headings to generate the table of contents.
      </p>
    </div>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import { Button } from '@meldui/vue'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@meldui/vue'
import { IconPlus, IconMinus, IconLayoutRows, IconTrash } from '@meldui/tabler-vue'

const props = defineProps(nodeViewProps)

const columnCount = computed(() => props.node.childCount)
const canAdd = computed(() => columnCount.value < 3)
const canRemove = computed(() => columnCount.value > 2)

const containerRef = ref<HTMLElement | null>(null)
const isHovered = ref(false)

// Dismiss bubble on outside click
function onDocumentMousedown(event: MouseEvent) {
  if (!props.selected) return
  if (containerRef.value?.contains(event.target as HTMLElement)) return
  props.editor.commands.setTextSelection(1)
  props.editor.commands.blur()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentMousedown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentMousedown)
})

function addColumn() {
  props.editor.commands.addColumn()
}

function removeColumn() {
  props.editor.commands.removeColumn()
}

function flatten() {
  props.editor.commands.unsetColumns()
}
</script>

<template>
  <NodeViewWrapper
    class="column-block py-2 my-3"
    :data-columns="columnCount"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div
      ref="containerRef"
      class="relative"
    >
      <!-- Bubble menu -->
      <div
        v-show="selected || isHovered"
        class="absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg whitespace-nowrap"
      >
        <TooltipProvider :delay-duration="400">
          <Tooltip v-if="canAdd">
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" @click.stop="addColumn">
                <IconPlus :size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" :side-offset="8">Add column</TooltipContent>
          </Tooltip>
          <Tooltip v-if="canRemove">
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" @click.stop="removeColumn">
                <IconMinus :size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" :side-offset="8">Remove column</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" @click.stop="flatten">
                <IconLayoutRows :size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" :side-offset="8">Flatten</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" class="text-destructive hover:bg-destructive/10" @click.stop="deleteNode">
                <IconTrash :size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" :side-offset="8">Delete</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <NodeViewContent class="column-content" />
    </div>
  </NodeViewWrapper>
</template>

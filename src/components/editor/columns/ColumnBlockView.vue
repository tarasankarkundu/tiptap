<script setup lang="ts">
import { computed, ref } from 'vue'
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

const isHovered = ref(false)
</script>

<template>
  <NodeViewWrapper
    class="column-block py-2 my-3"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="relative">
      <!-- Bubble menu -->
      <div
        v-show="isHovered"
        class="absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg whitespace-nowrap"
      >
        <TooltipProvider :delay-duration="400">
          <Tooltip v-if="canAdd">
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" @click.stop="editor.commands.addColumn()">
                <IconPlus :size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" :side-offset="8">Add column</TooltipContent>
          </Tooltip>
          <Tooltip v-if="canRemove">
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" @click.stop="editor.commands.removeColumn()">
                <IconMinus :size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" :side-offset="8">Remove column</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" @click.stop="editor.commands.unsetColumns()">
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

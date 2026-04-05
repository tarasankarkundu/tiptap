<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import type { ToolbarItem } from '../types'
import { Toggle } from '@meldui/vue'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@meldui/vue'
import { Separator } from '@meldui/vue'

defineProps<{
  editor: Editor
  items: ToolbarItem[]
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-1 border-b border-border bg-muted/50 px-3 py-2 rounded-t-lg">
    <TooltipProvider :delay-duration="300">
      <template v-for="item in items" :key="item.key">
        <Separator v-if="item.separator === 'before'" orientation="vertical" class="mx-1 h-6" />
        <Tooltip>
          <TooltipTrigger as-child>
            <Toggle
              size="sm"
              :pressed="item.isActive?.(editor) ?? false"
              @update:pressed="item.action(editor)"
            >
              <component :is="item.icon" :size="18" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="bottom" :side-offset="4">
            <p class="flex items-center gap-2">
              {{ item.label }}
              <kbd v-if="item.shortcut" class="text-xs text-muted-foreground">{{ item.shortcut }}</kbd>
            </p>
          </TooltipContent>
        </Tooltip>
        <Separator v-if="item.separator === 'after'" orientation="vertical" class="mx-1 h-6" />
      </template>
    </TooltipProvider>
  </div>
</template>

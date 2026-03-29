<script setup lang="ts">
import { ref, watch } from 'vue'
import type { MentionItem } from '../types'
import { IconLoader2 } from '@meldui/tabler-vue'

const props = defineProps<{
  items: MentionItem[]
  loading: boolean
  command: (item: MentionItem) => void
}>()

const selectedIndex = ref(0)

watch(
  () => props.items,
  () => { selectedIndex.value = 0 },
)

function selectItem(index: number) {
  const item = props.items[index]
  if (item) props.command(item)
}

function onKeyDown(event: KeyboardEvent): boolean {
  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
    return true
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
    return true
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }
  return false
}

defineExpose({ onKeyDown })
</script>

<template>
  <div class="min-w-48 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center gap-2 px-3 py-4">
      <IconLoader2 :size="16" class="animate-spin text-muted-foreground" />
      <span class="text-sm text-muted-foreground">Searching...</span>
    </div>

    <!-- Results -->
    <template v-else-if="items.length">
      <button
        v-for="(item, index) in items"
        :key="item.id"
        class="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-popover-foreground transition-colors"
        :class="index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'"
        @click="selectItem(index)"
        @mouseenter="selectedIndex = index"
      >
        <span class="text-muted-foreground">@</span>
        <span class="font-medium">{{ item.label }}</span>
      </button>
    </template>

    <!-- Empty -->
    <div v-else class="px-3 py-3 text-sm text-muted-foreground">
      No results found
    </div>
  </div>
</template>

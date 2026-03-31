<script setup lang="ts">
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription,
} from '@meldui/vue'
import {
  IconChartBar, IconChartPie,
} from '@meldui/tabler-vue'

defineProps<{ open: boolean }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'select': [category: 'series' | 'slice']
}>()
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-xs">
      <DialogHeader>
        <DialogTitle>Add Chart</DialogTitle>
        <DialogDescription>Choose a chart type to get started.</DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-2 gap-3">
        <button
          class="flex flex-col items-center gap-2 rounded-lg border border-border p-5 cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5"
          @click="emit('select', 'series')"
        >
          <IconChartBar :size="32" class="text-muted-foreground" />
          <span class="text-sm font-medium">Series Chart</span>
          <span class="text-xs text-muted-foreground text-center">Bar, Line, Area</span>
        </button>

        <button
          class="flex flex-col items-center gap-2 rounded-lg border border-border p-5 cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5"
          @click="emit('select', 'slice')"
        >
          <IconChartPie :size="32" class="text-muted-foreground" />
          <span class="text-sm font-medium">Slice Chart</span>
          <span class="text-xs text-muted-foreground text-center">Pie, Donut</span>
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>

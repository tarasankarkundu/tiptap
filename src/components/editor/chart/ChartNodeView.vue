<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { MeldChart } from '@meldui/charts-vue'
import { Button } from '@meldui/vue'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@meldui/vue'
import { IconSettings, IconTrash } from '@meldui/tabler-vue'
import ChartPickerDialog from './ChartPickerDialog.vue'
import ChartConfigDialog from './ChartConfigDialog.vue'

const props = defineProps(nodeViewProps)

const chartType = computed(() => props.node.attrs.chartType)
const config = computed(() => props.node.attrs.config)
const chartTitle = computed(() => props.node.attrs.title || '')
const isConfigured = computed(() => chartType.value !== null && config.value !== null)

const pickerOpen = ref(false)
const configOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

// Show picker on first render if unconfigured
onMounted(() => {
  if (!isConfigured.value) {
    pickerOpen.value = true
  }
  document.addEventListener('mousedown', onDocumentMousedown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentMousedown)
})

// Dismiss bubble on outside click
function onDocumentMousedown(event: MouseEvent) {
  if (!props.selected) return
  if (containerRef.value?.contains(event.target as HTMLElement)) return
  props.editor.commands.setTextSelection(1)
  props.editor.commands.blur()
}

const DEFAULT_CONFIGS = {
  series: {
    chartType: 'bar',
    config: {
      series: [{ name: 'Revenue', data: [120, 200, 150, 280, 190, 230] }],
      xAxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
    },
  },
  slice: {
    chartType: 'pie',
    config: {
      series: [
        { name: 'Chrome', data: [65] },
        { name: 'Safari', data: [18] },
        { name: 'Firefox', data: [10] },
        { name: 'Edge', data: [5] },
        { name: 'Other', data: [2] },
      ],
    },
  },
}

function onCategorySelect(category: 'series' | 'slice') {
  pickerOpen.value = false
  const defaults = DEFAULT_CONFIGS[category]
  props.updateAttributes({ chartType: defaults.chartType, config: defaults.config })
}

function onPickerClose(open: boolean) {
  pickerOpen.value = open
  // If user closes picker without selecting, remove the unconfigured node
  if (!open && !isConfigured.value) {
    props.deleteNode()
  }
}

function onConfigUpdate(newConfig: Record<string, unknown>, newType: string, newTitle: string) {
  props.updateAttributes({ config: newConfig, chartType: newType, title: newTitle })
  configOpen.value = false
}
</script>

<template>
  <NodeViewWrapper class="py-4">
    <div ref="containerRef" class="relative">
      <!-- Configured: show chart + controls -->
      <template v-if="isConfigured">
        <!-- Bubble controls when selected -->
        <div v-if="selected" class="absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg">
          <TooltipProvider :delay-duration="400">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon-sm" @click="configOpen = true">
                  <IconSettings :size="16" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" :side-offset="8">Configure chart</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon-sm" class="text-destructive hover:bg-destructive/10" @click="deleteNode">
                  <IconTrash :size="16" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" :side-offset="8">Delete chart</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <MeldChart
          :type="chartType"
          :config="config"
          :title="chartTitle || undefined"
        />
      </template>

      <!-- Unconfigured: show placeholder -->
      <div v-else class="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-8 text-muted-foreground">
        Selecting chart type...
      </div>
    </div>

    <!-- Picker dialog (shown on first insert) -->
    <ChartPickerDialog
      :open="pickerOpen"
      @update:open="onPickerClose"
      @select="onCategorySelect"
    />

    <!-- Config dialog (shown when editing existing chart) -->
    <ChartConfigDialog
      v-if="isConfigured"
      :open="configOpen"
      :chart-type="chartType"
      :config="config"
      :title="chartTitle"
      @update:open="configOpen = $event"
      @update="onConfigUpdate"
    />
  </NodeViewWrapper>
</template>

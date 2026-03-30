<script setup lang="ts">
import { computed, ref } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { MeldChart } from '@meldui/charts-vue'
import { Button } from '@meldui/vue'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@meldui/vue'
import { IconSettings, IconTrash } from '@meldui/tabler-vue'
import ChartConfigDialog from './ChartConfigDialog.vue'

const props = defineProps(nodeViewProps)

const chartType = computed(() => props.node.attrs.chartType || 'bar')
const config = computed(() => props.node.attrs.config)
const height = computed(() => props.node.attrs.height || 300)

const configOpen = ref(false)

function onConfigUpdate(newConfig: Record<string, unknown>, newType: string) {
  props.updateAttributes({ config: newConfig, chartType: newType })
  configOpen.value = false
}
</script>

<template>
  <NodeViewWrapper class="my-4">
    <div
      class="relative"
    >
      <!-- Controls when selected -->
      <div v-if="selected" class="absolute -top-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg">
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
              <Button variant="ghost" size="icon-sm" class="hover:bg-destructive/10 hover:text-destructive" @click="deleteNode">
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
        :height="height"
      />
    </div>

    <ChartConfigDialog
      :open="configOpen"
      :chart-type="chartType"
      :config="config"
      @update:open="configOpen = $event"
      @update="onConfigUpdate"
    />
  </NodeViewWrapper>
</template>

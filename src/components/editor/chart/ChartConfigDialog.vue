<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@meldui/vue'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@meldui/vue'
import { Button } from '@meldui/vue'
import { Input } from '@meldui/vue'
import { Separator } from '@meldui/vue'
import {
  IconChartBar, IconChartLine, IconChartPie, IconChartArea,
  IconPlus, IconX,
} from '@meldui/tabler-vue'

interface SeriesData {
  name: string
  data: number[]
}

const props = defineProps<{
  open: boolean
  chartType: string
  config: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update': [config: Record<string, unknown>, type: string]
}>()

const selectedType = ref(props.chartType)
const categories = ref<string[]>([])
const series = ref<SeriesData[]>([])
const pieLabels = ref<string[]>([])

const isPieType = computed(() => selectedType.value === 'pie' || selectedType.value === 'donut')

const chartTypes = [
  { type: 'bar', icon: IconChartBar, label: 'Bar' },
  { type: 'line', icon: IconChartLine, label: 'Line' },
  { type: 'area', icon: IconChartArea, label: 'Area' },
  { type: 'pie', icon: IconChartPie, label: 'Pie' },
]

// Parse existing config into editable state
function parseConfig(config: Record<string, unknown>) {
  const rawSeries = (config.series ?? []) as Array<{ name: string; data: number[] }>
  const rawCategories = ((config.xAxis as Record<string, unknown>)?.categories ?? []) as string[]
  const rawLabels = (config.labels ?? []) as string[]

  series.value = rawSeries.map(s => ({ name: s.name, data: [...s.data] }))
  categories.value = [...rawCategories]
  pieLabels.value = [...rawLabels]

  // Ensure at least one series with one data point
  if (series.value.length === 0) {
    series.value = [{ name: 'Series 1', data: [0] }]
  }
  if (categories.value.length === 0 && !isPieType.value) {
    categories.value = ['Item 1']
  }
  if (pieLabels.value.length === 0 && isPieType.value) {
    pieLabels.value = series.value[0]?.data.map((_, i) => `Slice ${i + 1}`) ?? ['Slice 1']
  }
}

watch(() => props.open, (val) => {
  if (val) {
    selectedType.value = props.chartType
    parseConfig(props.config)
  }
})

// When switching types, adapt data
watch(selectedType, (newType, oldType) => {
  if (isPieType.value && pieLabels.value.length === 0) {
    pieLabels.value = categories.value.length > 0
      ? [...categories.value]
      : series.value[0]?.data.map((_, i) => `Slice ${i + 1}`) ?? ['Slice 1']
    // Keep only first series for pie
    if (series.value.length > 1) {
      series.value = [series.value[0]!]
    }
  }
  if (!isPieType.value && categories.value.length === 0) {
    categories.value = pieLabels.value.length > 0
      ? [...pieLabels.value]
      : series.value[0]?.data.map((_, i) => `Item ${i + 1}`) ?? ['Item 1']
  }
})

// --- Category / Label management ---
function addCategory() {
  const idx = categories.value.length + 1
  categories.value.push(`Item ${idx}`)
  series.value.forEach(s => s.data.push(0))
}

function removeCategory(i: number) {
  if (categories.value.length <= 1) return
  categories.value.splice(i, 1)
  series.value.forEach(s => s.data.splice(i, 1))
}

function addPieSlice() {
  pieLabels.value.push(`Slice ${pieLabels.value.length + 1}`)
  series.value[0]?.data.push(0)
}

function removePieSlice(i: number) {
  if (pieLabels.value.length <= 1) return
  pieLabels.value.splice(i, 1)
  series.value[0]?.data.splice(i, 1)
}

// --- Series management ---
function addSeries() {
  const count = categories.value.length || series.value[0]?.data.length || 1
  series.value.push({ name: `Series ${series.value.length + 1}`, data: Array(count).fill(0) })
}

function removeSeries(i: number) {
  if (series.value.length <= 1) return
  series.value.splice(i, 1)
}

// --- Apply ---
function apply() {
  const config: Record<string, unknown> = {
    series: series.value.map(s => ({ name: s.name, data: [...s.data] })),
  }
  if (isPieType.value) {
    config.labels = [...pieLabels.value]
  } else {
    config.xAxis = { categories: [...categories.value] }
  }
  emit('update', config, selectedType.value)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Configure Chart</DialogTitle>
        <DialogDescription>Choose a type and edit your data.</DialogDescription>
      </DialogHeader>

      <!-- Chart type selector -->
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="ct in chartTypes"
          :key="ct.type"
          class="flex flex-col items-center gap-1.5 rounded-lg border p-3 cursor-pointer transition-colors"
          :class="selectedType === ct.type
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'"
          @click="selectedType = ct.type"
        >
          <component :is="ct.icon" :size="24" />
          <span class="text-xs font-medium">{{ ct.label }}</span>
        </button>
      </div>

      <Separator />

      <!-- Data editor -->
      <Tabs default-value="data">
        <TabsList class="w-full">
          <TabsTrigger value="data" class="flex-1">Data</TabsTrigger>
          <TabsTrigger v-if="!isPieType" value="categories" class="flex-1">Categories</TabsTrigger>
          <TabsTrigger v-if="isPieType" value="labels" class="flex-1">Labels</TabsTrigger>
        </TabsList>

        <!-- Series data tab -->
        <TabsContent value="data" class="mt-3 space-y-4">
          <div v-for="(s, si) in series" :key="si" class="space-y-2">
            <div class="flex items-center gap-2">
              <Input
                v-model="s.name"
                placeholder="Series name"
                class="flex-1 text-sm"
              />
              <Button
                v-if="!isPieType && series.length > 1"
                variant="ghost"
                size="icon-sm"
                class="shrink-0 text-destructive hover:bg-destructive/10"
                @click="removeSeries(si)"
              >
                <IconX :size="14" />
              </Button>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <div v-for="(_, di) in s.data" :key="di" class="flex items-center gap-1">
                <span class="text-xs text-muted-foreground w-6 shrink-0 text-right">
                  {{ isPieType ? (pieLabels[di] ?? di + 1) : (categories[di] ?? di + 1) }}
                </span>
                <Input
                  :model-value="String(s.data[di])"
                  type="number"
                  class="text-sm h-8"
                  @update:model-value="(v: string | number) => s.data[di] = Number(v) || 0"
                />
              </div>
            </div>
          </div>
          <Button
            v-if="!isPieType"
            variant="outline"
            size="sm"
            class="w-full"
            @click="addSeries"
          >
            <IconPlus :size="14" class="mr-1" /> Add Series
          </Button>
        </TabsContent>

        <!-- Categories tab (bar/line/area) -->
        <TabsContent v-if="!isPieType" value="categories" class="mt-3 space-y-2">
          <div v-for="(_, i) in categories" :key="i" class="flex items-center gap-2">
            <Input
              v-model="categories[i]"
              placeholder="Category name"
              class="flex-1 text-sm"
            />
            <Button
              v-if="categories.length > 1"
              variant="ghost"
              size="icon-sm"
              class="shrink-0 text-destructive hover:bg-destructive/10"
              @click="removeCategory(i)"
            >
              <IconX :size="14" />
            </Button>
          </div>
          <Button variant="outline" size="sm" class="w-full" @click="addCategory">
            <IconPlus :size="14" class="mr-1" /> Add Category
          </Button>
        </TabsContent>

        <!-- Labels tab (pie) -->
        <TabsContent v-if="isPieType" value="labels" class="mt-3 space-y-2">
          <div v-for="(_, i) in pieLabels" :key="i" class="flex items-center gap-2">
            <Input
              v-model="pieLabels[i]"
              placeholder="Label"
              class="flex-1 text-sm"
            />
            <Button
              v-if="pieLabels.length > 1"
              variant="ghost"
              size="icon-sm"
              class="shrink-0 text-destructive hover:bg-destructive/10"
              @click="removePieSlice(i)"
            >
              <IconX :size="14" />
            </Button>
          </div>
          <Button variant="outline" size="sm" class="w-full" @click="addPieSlice">
            <IconPlus :size="14" class="mr-1" /> Add Slice
          </Button>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">Cancel</Button>
        <Button @click="apply">Apply</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

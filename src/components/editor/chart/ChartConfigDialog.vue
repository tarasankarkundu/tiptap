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
  IconChartBar, IconChartLine, IconChartArea,
  IconChartPie, IconChartDonut,
  IconPlus, IconX,
} from '@meldui/tabler-vue'

// --- Types ---
interface SeriesData { name: string; data: number[] }
interface SliceData { name: string; value: number }

type ChartCategory = 'series' | 'slice'

const props = defineProps<{
  open: boolean
  chartType: string
  config: Record<string, unknown>
  title?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update': [config: Record<string, unknown>, type: string, title: string]
}>()

// --- State ---
const category = computed<ChartCategory>(() =>
  props.chartType === 'pie' || props.chartType === 'donut' ? 'slice' : 'series',
)

const selectedType = ref(props.chartType)
const chartTitle = ref(props.title ?? '')

// Series chart state
const series = ref<SeriesData[]>([])
const categories = ref<string[]>([])

// Slice chart state
const slices = ref<SliceData[]>([])

const seriesTypes = [
  { type: 'bar', icon: IconChartBar, label: 'Bar' },
  { type: 'line', icon: IconChartLine, label: 'Line' },
  { type: 'area', icon: IconChartArea, label: 'Area' },
]

const sliceTypes = [
  { type: 'pie', icon: IconChartPie, label: 'Pie' },
  { type: 'donut', icon: IconChartDonut, label: 'Donut' },
]

// --- Parse config on open ---
watch(() => props.open, (val) => {
  if (!val) return
  selectedType.value = props.chartType
  chartTitle.value = props.title ?? ''
  const rawSeries = (props.config.series ?? []) as Array<{ name: string; data: number[] }>
  const rawCategories = ((props.config.xAxis as Record<string, unknown>)?.categories ?? []) as string[]

  if (category.value === 'slice') {
    slices.value = rawSeries.map(s => ({ name: s.name, value: s.data[0] ?? 0 }))
    if (slices.value.length === 0) {
      slices.value = [{ name: 'Slice 1', value: 35 }, { name: 'Slice 2', value: 25 }, { name: 'Slice 3', value: 20 }]
    }
  } else {
    series.value = rawSeries.map(s => ({ name: s.name, data: [...s.data] }))
    categories.value = [...rawCategories]
    if (series.value.length === 0) series.value = [{ name: 'Series 1', data: [0] }]
    if (categories.value.length === 0) categories.value = ['Item 1']
  }
})

// --- Series chart: category management ---
function addCategory() {
  categories.value.push(`Item ${categories.value.length + 1}`)
  series.value.forEach(s => s.data.push(0))
}
function removeCategory(i: number) {
  if (categories.value.length <= 1) return
  categories.value.splice(i, 1)
  series.value.forEach(s => s.data.splice(i, 1))
}
function addSeries() {
  series.value.push({ name: `Series ${series.value.length + 1}`, data: Array(categories.value.length).fill(0) })
}
function removeSeries(i: number) {
  if (series.value.length <= 1) return
  series.value.splice(i, 1)
}

// --- Slice chart: slice management ---
function addSlice() {
  slices.value.push({ name: `Slice ${slices.value.length + 1}`, value: 10 })
}
function removeSlice(i: number) {
  if (slices.value.length <= 1) return
  slices.value.splice(i, 1)
}

// --- Apply ---
function apply() {
  const config: Record<string, unknown> = {}
  if (category.value === 'slice') {
    config.series = slices.value.map(s => ({ name: s.name, data: [s.value] }))
  } else {
    config.series = series.value.map(s => ({ name: s.name, data: [...s.data] }))
    config.xAxis = { categories: [...categories.value] }
  }
  emit('update', config, selectedType.value, chartTitle.value)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Configure Chart</DialogTitle>
        <DialogDescription>
          {{ category === 'series' ? 'Edit your series chart data.' : 'Edit your slice chart data.' }}
        </DialogDescription>
      </DialogHeader>

      <!-- Title (optional) -->
      <Input
        v-model="chartTitle"
        placeholder="Chart title (optional)"
        class="text-sm"
      />

      <!-- Type switcher (within same category only) -->
      <div class="flex gap-2">
        <button
          v-for="ct in (category === 'slice' ? sliceTypes : seriesTypes)"
          :key="ct.type"
          class="flex flex-1 items-center justify-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors"
          :class="selectedType === ct.type
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'"
          @click="selectedType = ct.type"
        >
          <component :is="ct.icon" :size="20" />
          <span class="text-sm font-medium">{{ ct.label }}</span>
        </button>
      </div>

      <Separator />

      <!-- Slice chart editor (pie/donut) -->
      <div v-if="category === 'slice'" class="space-y-3">
        <div v-for="(slice, i) in slices" :key="i" class="flex items-center gap-2">
          <Input v-model="slice.name" placeholder="Label" class="flex-1 text-sm" />
          <Input
            :model-value="String(slice.value)"
            type="number"
            class="w-24 text-sm"
            @update:model-value="(v: string | number) => slice.value = Number(v) || 0"
          />
          <Button
            v-if="slices.length > 1"
            variant="ghost" size="icon-sm"
            class="shrink-0 text-destructive hover:bg-destructive/10"
            @click="removeSlice(i)"
          >
            <IconX :size="14" />
          </Button>
        </div>
        <Button variant="outline" size="sm" class="w-full" @click="addSlice">
          <IconPlus :size="14" class="mr-1" /> Add Slice
        </Button>
      </div>

      <!-- Series chart editor (bar/line/area) -->
      <Tabs v-else default-value="data">
        <TabsList class="w-full">
          <TabsTrigger value="data" class="flex-1">Data</TabsTrigger>
          <TabsTrigger value="categories" class="flex-1">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="data" class="mt-3 space-y-4">
          <div v-for="(s, si) in series" :key="si" class="space-y-2">
            <div class="flex items-center gap-2">
              <Input v-model="s.name" placeholder="Series name" class="flex-1 text-sm" />
              <Button
                v-if="series.length > 1"
                variant="ghost" size="icon-sm"
                class="shrink-0 text-destructive hover:bg-destructive/10"
                @click="removeSeries(si)"
              >
                <IconX :size="14" />
              </Button>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <div v-for="(_, di) in s.data" :key="di" class="flex items-center gap-1">
                <span class="text-xs text-muted-foreground w-8 shrink-0 text-right truncate">{{ categories[di] ?? di + 1 }}</span>
                <Input
                  :model-value="String(s.data[di])"
                  type="number"
                  class="text-sm h-8"
                  @update:model-value="(v: string | number) => s.data[di] = Number(v) || 0"
                />
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" class="w-full" @click="addSeries">
            <IconPlus :size="14" class="mr-1" /> Add Series
          </Button>
        </TabsContent>

        <TabsContent value="categories" class="mt-3 space-y-2">
          <div v-for="(_, i) in categories" :key="i" class="flex items-center gap-2">
            <Input v-model="categories[i]" placeholder="Category name" class="flex-1 text-sm" />
            <Button
              v-if="categories.length > 1"
              variant="ghost" size="icon-sm"
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
      </Tabs>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">Cancel</Button>
        <Button @click="apply">Apply</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

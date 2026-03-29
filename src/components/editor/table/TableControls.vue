<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/core'
import { Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@meldui/vue'
import { IconPlus, IconTrash, IconRowInsertTop, IconRowInsertBottom, IconColumnInsertLeft, IconColumnInsertRight } from '@meldui/tabler-vue'

const props = defineProps<{
  editor: Editor
  containerEl: HTMLElement | null
}>()

const visible = ref(false)
const rowHandles = ref<Array<{ top: number; height: number }>>([])
const colHandles = ref<Array<{ left: number; width: number }>>([])
const tbl = ref({ top: 0, left: 0, width: 0, height: 0 })
const hoveredRow = ref(-1)
const hoveredCol = ref(-1)
const menu = ref<{ type: 'row' | 'col'; index: number; top: number; left: number } | null>(null)
let tableEl: HTMLElement | null = null

function findTable() {
  const { $from } = props.editor.state.selection
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'table') {
      return { pos: $from.before(d), node: $from.node(d), depth: d }
    }
  }
  return null
}

function focusCell(rowIndex: number, colIndex: number) {
  const table = findTable()
  if (!table) return
  let pos = table.pos + 1
  for (let r = 0; r < table.node.childCount; r++) {
    const row = table.node.child(r)
    if (r === rowIndex) {
      let cPos = pos + 1
      for (let c = 0; c < row.childCount; c++) {
        if (c === colIndex) {
          props.editor.chain().focus().setTextSelection(cPos + 1).run()
          return
        }
        cPos += row.child(c).nodeSize
      }
      props.editor.chain().focus().setTextSelection(pos + 2).run()
      return
    }
    pos += row.nodeSize
  }
}

function update() {
  if (!props.containerEl) { visible.value = false; return }
  const table = findTable()
  if (!table) { visible.value = false; menu.value = null; return }
  const dom = props.editor.view.nodeDOM(table.pos) as HTMLElement | null
  if (!dom) { visible.value = false; return }
  const el = dom.tagName === 'TABLE' ? dom : dom.querySelector('table')
  if (!el) { visible.value = false; return }
  tableEl = el as HTMLElement
  visible.value = true
  const cr = props.containerEl.getBoundingClientRect()
  const tr = el.getBoundingClientRect()
  tbl.value = { top: tr.top - cr.top, left: tr.left - cr.left, width: tr.width, height: tr.height }
  const trs = el.querySelectorAll('tr')
  rowHandles.value = Array.from(trs).map((row) => {
    const r = row.getBoundingClientRect()
    return { top: r.top - cr.top, height: r.height }
  })
  if (trs.length > 0 && trs[0]) {
    const cells = trs[0].querySelectorAll('th, td')
    colHandles.value = Array.from(cells).map((cell) => {
      const r = cell.getBoundingClientRect()
      return { left: r.left - cr.left, width: r.width }
    })
  }
}

function onMouseMove(e: MouseEvent) {
  if (!tableEl || !visible.value) { hoveredRow.value = -1; hoveredCol.value = -1; return }
  const tRect = tableEl.getBoundingClientRect()
  const x = e.clientX, y = e.clientY
  const hz = 24
  if (x < tRect.left - hz || x > tRect.right + hz || y < tRect.top - hz || y > tRect.bottom + hz) {
    hoveredRow.value = -1; hoveredCol.value = -1; return
  }
  const trs = tableEl.querySelectorAll('tr')
  let foundRow = -1
  for (let i = 0; i < trs.length; i++) {
    const r = trs[i]!.getBoundingClientRect()
    if (y >= r.top && y <= r.bottom) { foundRow = i; break }
  }
  if (foundRow === -1 && y > tRect.bottom && y <= tRect.bottom + hz) foundRow = trs.length - 1
  hoveredRow.value = foundRow
  if (trs.length > 0 && trs[0]) {
    const cells = trs[0].querySelectorAll('th, td')
    let foundCol = -1
    for (let i = 0; i < cells.length; i++) {
      const r = cells[i]!.getBoundingClientRect()
      if (x >= r.left && x <= r.right) { foundCol = i; break }
    }
    if (foundCol === -1 && x > tRect.right && x <= tRect.right + hz) foundCol = cells.length - 1
    hoveredCol.value = foundCol
  }
}

function openRowMenu(index: number, e: MouseEvent) {
  focusCell(index, 0)
  const cr = props.containerEl!.getBoundingClientRect()
  const br = (e.currentTarget as HTMLElement).getBoundingClientRect()
  menu.value = { type: 'row', index, top: br.bottom - cr.top + 4, left: br.left - cr.left }
}

function openColMenu(index: number, e: MouseEvent) {
  focusCell(0, index)
  const cr = props.containerEl!.getBoundingClientRect()
  const br = (e.currentTarget as HTMLElement).getBoundingClientRect()
  menu.value = { type: 'col', index, top: br.bottom - cr.top + 4, left: br.left - cr.left }
}

function run(fn: () => void) {
  fn(); menu.value = null; nextTick(update)
}

function addRowAtEnd() {
  const table = findTable()
  if (!table) return
  focusCell(table.node.childCount - 1, 0)
  nextTick(() => { props.editor.chain().focus().addRowAfter().run(); nextTick(update) })
}

function addColAtEnd() {
  const table = findTable()
  if (!table || table.node.childCount === 0) return
  focusCell(0, table.node.child(0).childCount - 1)
  nextTick(() => { props.editor.chain().focus().addColumnAfter().run(); nextTick(update) })
}

function onDocClick(e: MouseEvent) {
  if (menu.value) {
    const t = e.target as HTMLElement
    if (!t.closest('.tc-menu') && !t.closest('.tc-handle')) menu.value = null
  }
}

let unwatch: (() => void) | null = null

onMounted(() => {
  const handler = () => nextTick(update)
  props.editor.on('transaction', handler)
  unwatch = () => props.editor.off('transaction', handler)
  document.addEventListener('click', onDocClick, true)
  document.addEventListener('mousemove', onMouseMove)
  update()
})

onBeforeUnmount(() => {
  unwatch?.()
  document.removeEventListener('click', onDocClick, true)
  document.removeEventListener('mousemove', onMouseMove)
})
</script>

<template>
  <div v-show="visible" class="table-controls-root absolute top-0 left-0 pointer-events-none z-[15]">
    <!-- Column handles -->
    <button
      v-for="(col, i) in colHandles"
      :key="'c' + i"
      class="tc-handle absolute flex items-center justify-center h-[18px] border-0 rounded bg-accent/50 text-muted-foreground cursor-pointer p-0 opacity-0 pointer-events-none transition-opacity"
      :class="{ 'opacity-70 pointer-events-auto': hoveredCol === i || (menu?.type === 'col' && menu.index === i) }"
      :style="{ left: col.left + 'px', width: col.width + 'px', top: tbl.top - 20 + 'px' }"
      @click.stop="openColMenu(i, $event)"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><circle cx="3" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="9" cy="6" r="1.2"/></svg>
    </button>

    <!-- Row handles -->
    <button
      v-for="(row, i) in rowHandles"
      :key="'r' + i"
      class="tc-handle absolute flex items-center justify-center w-[18px] border-0 rounded bg-accent/50 text-muted-foreground cursor-pointer p-0 opacity-0 pointer-events-none transition-opacity"
      :class="{ 'opacity-70 pointer-events-auto': hoveredRow === i || (menu?.type === 'row' && menu.index === i) }"
      :style="{ top: row.top + 'px', height: row.height + 'px', left: tbl.left - 20 + 'px' }"
      @click.stop="openRowMenu(i, $event)"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="3" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="6" cy="9" r="1.2"/></svg>
    </button>

    <!-- Add column button -->
    <TooltipProvider :delay-duration="400">
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            class="absolute flex items-center justify-center w-5 border-0 rounded bg-accent/30 text-muted-foreground cursor-pointer opacity-0 pointer-events-none transition-opacity hover:opacity-100 hover:bg-accent"
            :class="{ 'opacity-50 pointer-events-auto': hoveredCol === colHandles.length - 1 }"
            :style="{ left: tbl.left + tbl.width + 2 + 'px', top: tbl.top + 'px', height: tbl.height + 'px' }"
            @click="addColAtEnd"
          >
            <IconPlus :size="14" :stroke="1.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" :side-offset="4">Add column</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- Add row button -->
    <TooltipProvider :delay-duration="400">
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            class="absolute flex items-center justify-center h-5 border-0 rounded bg-accent/30 text-muted-foreground cursor-pointer opacity-0 pointer-events-none transition-opacity hover:opacity-100 hover:bg-accent"
            :class="{ 'opacity-50 pointer-events-auto': hoveredRow === rowHandles.length - 1 }"
            :style="{ top: tbl.top + tbl.height + 2 + 'px', left: tbl.left + 'px', width: tbl.width + 'px' }"
            @click="addRowAtEnd"
          >
            <IconPlus :size="14" :stroke="1.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" :side-offset="4">Add row</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- Context menu -->
    <div
      v-if="menu"
      class="tc-menu absolute min-w-[200px] rounded-lg border border-border bg-popover p-1 shadow-lg z-[100] pointer-events-auto"
      :style="{ top: menu.top + 'px', left: menu.left + 'px' }"
      @click.stop
    >
      <template v-if="menu.type === 'row'">
        <button class="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent" @click="run(() => editor.chain().focus().addRowBefore().run())">
          <IconRowInsertTop :size="16" /> Insert row above
        </button>
        <button class="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent" @click="run(() => editor.chain().focus().addRowAfter().run())">
          <IconRowInsertBottom :size="16" /> Insert row below
        </button>
        <Separator class="my-1" />
        <button class="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10" @click="run(() => editor.chain().focus().deleteRow().run())">
          <IconTrash :size="16" /> Delete row
        </button>
      </template>
      <template v-else>
        <button class="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent" @click="run(() => editor.chain().focus().addColumnBefore().run())">
          <IconColumnInsertLeft :size="16" /> Insert column before
        </button>
        <button class="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent" @click="run(() => editor.chain().focus().addColumnAfter().run())">
          <IconColumnInsertRight :size="16" /> Insert column after
        </button>
        <Separator class="my-1" />
        <button class="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10" @click="run(() => editor.chain().focus().deleteColumn().run())">
          <IconTrash :size="16" /> Delete column
        </button>
      </template>
      <Separator class="my-1" />
      <button class="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10" @click="run(() => editor.chain().focus().deleteTable().run())">
        <IconTrash :size="16" /> Delete table
      </button>
    </div>
  </div>
</template>

<style scoped>
.table-controls-root > * {
  pointer-events: auto;
}

.tc-handle:hover {
  opacity: 1 !important;
  background: var(--accent);
  color: var(--foreground);
}
</style>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/core'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@meldui/vue'
import { IconPlus, IconGripVertical } from '@meldui/tabler-vue'

const props = defineProps<{
  editor: Editor
  containerEl: HTMLElement | null
}>()

const dragHandleVisible = ref(false)
const dragHandleTop = ref(0)
const dragHandleBlock = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dropIndicatorTop = ref(0)
const dropIndicatorVisible = ref(false)
let draggedNodePos = -1

function getBlockAtY(y: number): HTMLElement | null {
  if (!props.containerEl) return null
  const editorEl = props.containerEl.querySelector('.tiptap') as HTMLElement
  if (!editorEl) return null
  const blocks = editorEl.querySelectorAll(':scope > *')
  for (const block of blocks) {
    const rect = (block as HTMLElement).getBoundingClientRect()
    if (y >= rect.top && y <= rect.bottom) return block as HTMLElement
  }
  return null
}

function resolveBlockPos(blockEl: HTMLElement): { pos: number; nodeSize: number } | null {
  // Walk the doc's top-level children and match by their DOM representation
  const { doc } = props.editor.state
  let pos = 0
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i)
    try {
      const dom = props.editor.view.nodeDOM(pos)
      // nodeDOM returns the outermost DOM node for this ProseMirror node.
      // For node views, it returns the [data-node-view-wrapper] container.
      // Check if it matches or contains our block element.
      if (dom === blockEl || (dom instanceof HTMLElement && blockEl.contains(dom)) || (dom instanceof HTMLElement && dom.contains(blockEl))) {
        return { pos, nodeSize: child.nodeSize }
      }
    } catch {
      // nodeDOM can throw for some positions
    }
    pos += child.nodeSize
  }
  return null
}

function handleMouseMove(event: MouseEvent) {
  if (!props.containerEl || isDragging.value) return
  const found = getBlockAtY(event.clientY)
  if (found) {
    const bodyRect = props.containerEl.getBoundingClientRect()
    const blockRect = found.getBoundingClientRect()
    const handleHeight = 24
    const style = window.getComputedStyle(found)
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2
    const paddingTop = parseFloat(style.paddingTop) || 0
    const offset = paddingTop + Math.max(0, (lineHeight - handleHeight) / 2)
    dragHandleTop.value = blockRect.top - bodyRect.top + offset
    dragHandleBlock.value = found
    dragHandleVisible.value = true
  } else {
    dragHandleVisible.value = false
  }
}

function handleMouseLeave() {
  if (!isDragging.value) dragHandleVisible.value = false
}

function handleGripDragStart(event: DragEvent) {
  if (!dragHandleBlock.value || !event.dataTransfer) return
  const info = resolveBlockPos(dragHandleBlock.value)
  if (!info) return
  draggedNodePos = info.pos
  isDragging.value = true
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', '')
  event.dataTransfer.setDragImage(dragHandleBlock.value, 0, 0)
}

function handleBodyDragOver(event: DragEvent) {
  if (!isDragging.value || !props.containerEl) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  const bodyRect = props.containerEl.getBoundingClientRect()
  const editorEl = props.containerEl.querySelector('.tiptap') as HTMLElement
  if (!editorEl) return
  const blocks = editorEl.querySelectorAll(':scope > *')
  let closestTop = 0
  let closestDist = Infinity
  for (const block of blocks) {
    const rect = (block as HTMLElement).getBoundingClientRect()
    const distTop = Math.abs(event.clientY - rect.top)
    if (distTop < closestDist) { closestDist = distTop; closestTop = rect.top - bodyRect.top }
    const distBottom = Math.abs(event.clientY - rect.bottom)
    if (distBottom < closestDist) { closestDist = distBottom; closestTop = rect.bottom - bodyRect.top }
  }
  dropIndicatorTop.value = closestTop
  dropIndicatorVisible.value = true
}

function handleBodyDragLeave() {
  dropIndicatorVisible.value = false
}

function handleBodyDrop(event: DragEvent) {
  event.preventDefault()
  dropIndicatorVisible.value = false
  isDragging.value = false
  dragHandleVisible.value = false
  if (draggedNodePos < 0) return
  const editorEl = props.containerEl?.querySelector('.tiptap') as HTMLElement
  if (!editorEl) return
  const blocks = editorEl.querySelectorAll(':scope > *')
  let targetPos = -1
  for (const block of blocks) {
    const rect = (block as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const info = resolveBlockPos(block as HTMLElement)
    if (!info) continue
    if (event.clientY < midY) { targetPos = info.pos; break }
    else { targetPos = info.pos + info.nodeSize }
  }
  if (targetPos < 0) return
  const { state } = props.editor
  const node = state.doc.nodeAt(draggedNodePos)
  if (!node) return
  const nodeSize = node.nodeSize
  if (targetPos === draggedNodePos || targetPos === draggedNodePos + nodeSize) return
  const { tr } = state
  const nodeContent = node.toJSON()
  if (targetPos > draggedNodePos) {
    tr.delete(draggedNodePos, draggedNodePos + nodeSize)
    tr.insert(targetPos - nodeSize, state.schema.nodeFromJSON(nodeContent))
  } else {
    tr.insert(targetPos, state.schema.nodeFromJSON(nodeContent))
    tr.delete(draggedNodePos + nodeSize, draggedNodePos + nodeSize + nodeSize)
  }
  props.editor.view.dispatch(tr)
  draggedNodePos = -1
}

function handleDragEnd() {
  isDragging.value = false
  dropIndicatorVisible.value = false
  draggedNodePos = -1
}

function handlePlusClick() {
  if (!dragHandleBlock.value) return
  const e = props.editor
  const pos = e.view.posAtDOM(dragHandleBlock.value, 0)
  const $pos = e.state.doc.resolve(pos)

  // If the current block is empty, just type / in it
  if ($pos.parent.content.size === 0) {
    e.chain().focus().setTextSelection(pos).insertContent('/').run()
    return
  }

  // Otherwise, insert a new paragraph with / after the current top-level block
  const depth = Math.min($pos.depth, 1) || 1
  const blockStart = $pos.before(depth)
  const node = e.state.doc.nodeAt(blockStart)
  if (!node) return
  const insertAt = blockStart + node.nodeSize

  e.chain()
    .focus()
    .insertContentAt(insertAt, { type: 'paragraph', content: [{ type: 'text', text: '/' }] })
    .setTextSelection(insertAt + 2)
    .run()
}

// Register drag event handlers in capture phase so they fire BEFORE ProseMirror
function onContainerDragOver(event: DragEvent) {
  if (!isDragging.value) return
  event.stopPropagation()
  handleBodyDragOver(event)
}

function onContainerDragLeave() {
  if (!isDragging.value) return
  handleBodyDragLeave()
}

function onContainerDrop(event: DragEvent) {
  if (!isDragging.value) return
  event.stopPropagation()
  handleBodyDrop(event)
}

let cleanupListeners: (() => void) | null = null

watch(() => props.containerEl, (el, oldEl) => {
  cleanupListeners?.()
  cleanupListeners = null
  if (!el) return

  el.addEventListener('dragover', onContainerDragOver, true)
  el.addEventListener('dragleave', onContainerDragLeave, true)
  el.addEventListener('drop', onContainerDrop, true)

  cleanupListeners = () => {
    el.removeEventListener('dragover', onContainerDragOver, true)
    el.removeEventListener('dragleave', onContainerDragLeave, true)
    el.removeEventListener('drop', onContainerDrop, true)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  cleanupListeners?.()
})

defineExpose({
  handleMouseMove,
  handleMouseLeave,
})
</script>

<template>
  <!-- Drag handle -->
  <div
    v-show="dragHandleVisible"
    class="absolute left-2 z-10 flex items-center gap-0 opacity-0 transition-[top] duration-100"
    :class="{ 'opacity-100': dragHandleVisible }"
    :style="{ top: dragHandleTop + 'px' }"
  >
    <TooltipProvider :delay-duration="400">
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            class="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer border-0 bg-transparent p-0"
            @click.stop="handlePlusClick"
          >
            <IconPlus :size="16" :stroke="1.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" :side-offset="4">Add block</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger as-child>
          <div
            class="flex items-center justify-center w-5 h-6 rounded text-muted-foreground hover:bg-accent hover:text-foreground cursor-grab active:cursor-grabbing p-0"
            draggable="true"
            @dragstart="handleGripDragStart"
            @dragend="handleDragEnd"
          >
            <IconGripVertical :size="14" :stroke="1.5" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" :side-offset="4">Drag to move</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>

  <!-- Drop indicator -->
  <div
    v-show="dropIndicatorVisible"
    class="absolute left-14 right-0 h-0.5 bg-primary rounded-sm z-20 pointer-events-none"
    :style="{ top: dropIndicatorTop + 'px' }"
  />
</template>

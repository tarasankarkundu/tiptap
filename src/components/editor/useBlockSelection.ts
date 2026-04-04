import { onMounted, onUnmounted, type Ref, type ShallowRef } from 'vue'
import type { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { blockSelectionKey, topBlockIndex, type BlockRange } from './BlockSelectionPlugin'

/**
 * Handles block selection mouse events at document level.
 * - Drag within the editor wrapper triggers block selection (including margins)
 * - Click outside the editor wrapper clears selection
 * - Smooth dragging across the entire viewport
 */
export function useBlockSelection(
  editor: ShallowRef<Editor | undefined>,
  wrapperRef: Ref<HTMLElement | null>,
) {
  let dragAnchor: number | null = null
  let isDragging = false

  function resolveBlockIndex(clientX: number, clientY: number): number | null {
    const view = editor.value?.view
    if (!view) return null
    const rect = view.dom.getBoundingClientRect()
    const clampedX = Math.max(rect.left + 1, Math.min(clientX, rect.right - 1))
    const clampedY = Math.max(rect.top + 1, Math.min(clientY, rect.bottom - 1))
    const pos = view.posAtCoords({ left: clampedX, top: clampedY })
    if (pos) return topBlockIndex(view.state.doc, pos.pos)
    if (clientY < rect.top) return 0
    if (clientY > rect.bottom) return view.state.doc.childCount - 1
    return null
  }

  function clearState() {
    const view = editor.value?.view
    if (!view) return
    const { state } = view
    const prev = blockSelectionKey.getState(state) as BlockRange | null
    const { from, to } = state.selection
    if (prev || from !== to) {
      const tr = state.tr.setMeta(blockSelectionKey, null)
      tr.setSelection(TextSelection.create(state.doc, state.selection.from))
      view.dispatch(tr)
    }
  }

  function onMousedown(event: MouseEvent) {
    if (event.button !== 0) return
    if (!editor.value?.view) return

    const isInsideWrapper = wrapperRef.value?.contains(event.target as Node)

    if (!isInsideWrapper) {
      // Click outside — just clear selection, don't start tracking
      clearState()
      return
    }

    // Click inside wrapper — clear previous selection and start tracking
    clearState()
    const idx = resolveBlockIndex(event.clientX, event.clientY)
    if (idx === null) return
    dragAnchor = idx
    isDragging = false
  }

  function onMousemove(event: MouseEvent) {
    if (dragAnchor === null) return
    const view = editor.value?.view
    if (!view) return

    if (!(event.buttons & 1)) {
      dragAnchor = null
      isDragging = false
      return
    }

    const headIndex = resolveBlockIndex(event.clientX, event.clientY)
    if (headIndex === null) return

    const low = Math.min(dragAnchor, headIndex)
    const high = Math.max(dragAnchor, headIndex)

    if (low === high) {
      if (isDragging) {
        isDragging = false
        view.dispatch(view.state.tr.setMeta(blockSelectionKey, null))
      }
      return
    }

    const current = blockSelectionKey.getState(view.state) as BlockRange | null
    if (current && current.low === low && current.high === high) return

    isDragging = true
    view.dispatch(view.state.tr.setMeta(blockSelectionKey, { low, high }))
    event.preventDefault()
  }

  function onMouseup() {
    dragAnchor = null
    isDragging = false
  }

  onMounted(() => {
    document.addEventListener('mousedown', onMousedown)
    document.addEventListener('mousemove', onMousemove)
    document.addEventListener('mouseup', onMouseup)
  })

  onUnmounted(() => {
    document.removeEventListener('mousedown', onMousedown)
    document.removeEventListener('mousemove', onMousemove)
    document.removeEventListener('mouseup', onMouseup)
  })
}

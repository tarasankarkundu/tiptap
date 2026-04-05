import { onMounted, onUnmounted, type Ref, type ShallowRef } from 'vue'
import type { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { blockSelectionKey, topBlockIndex, type BlockRange } from './BlockSelectionPlugin'

/**
 * Handles block selection mouse events at document level.
 * - Drag within the editor root triggers block selection (including margins)
 * - Click outside the editor root clears selection
 * - Document-level mousemove/mouseup for smooth cross-viewport dragging
 */
export function useBlockSelection(
  editor: ShallowRef<Editor | undefined>,
  rootRef: Ref<HTMLElement | null>,
) {
  let dragAnchor: number | null = null
  let isDragging = false

  function resolveBlockIndex(clientX: number, clientY: number): number | null {
    const view = editor.value?.view
    if (!view) return null
    const rect = view.dom.getBoundingClientRect()
    // Clamp to editor content area so posAtCoords works from margins too
    const x = Math.max(rect.left + 1, Math.min(clientX, rect.right - 1))
    const y = Math.max(rect.top + 1, Math.min(clientY, rect.bottom - 1))
    const pos = view.posAtCoords({ left: x, top: y })
    if (pos) return topBlockIndex(view.state.doc, pos.pos)
    if (clientY < rect.top) return 0
    if (clientY > rect.bottom) return view.state.doc.childCount - 1
    return null
  }

  function hasActiveSelection(): boolean {
    const view = editor.value?.view
    if (!view) return false
    if (blockSelectionKey.getState(view.state)) return true
    const { from, to } = view.state.selection
    return from !== to && topBlockIndex(view.state.doc, from) !== topBlockIndex(view.state.doc, to)
  }

  function clearSelection() {
    const view = editor.value?.view
    if (!view || !hasActiveSelection()) return
    const { state } = view
    const tr = state.tr.setMeta(blockSelectionKey, null)
    tr.setSelection(TextSelection.create(state.doc, state.selection.from))
    view.dispatch(tr)
  }

  function onMousedown(event: MouseEvent) {
    if (event.button !== 0 || !editor.value?.view) return
    const target = event.target as HTMLElement

    if (!rootRef.value?.contains(target)) {
      clearSelection()
      return
    }

    // Don't interfere with clicks on buttons/controls (bubble menus, drag handle, etc.)
    if (target.closest('button, [role="button"], [data-drag-handle]')) {
      return
    }

    clearSelection()
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

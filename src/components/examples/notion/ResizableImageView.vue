<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const isHovered = ref(false)
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)
const resizeDirection = ref<'left' | 'right'>('right')
const imageRef = ref<HTMLImageElement | null>(null)
const captionRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

const imageWidth = computed(() => {
  const w = props.node.attrs.width
  return w ? `${w}px` : '100%'
})

const alignment = computed(() => props.node.attrs.align || 'center')
const caption = computed(() => props.node.attrs.caption || '')
const showCaption = computed(() => props.node.attrs.showCaption)

const wrapperJustify = computed(() => {
  switch (alignment.value) {
    case 'left': return 'flex-start'
    case 'right': return 'flex-end'
    default: return 'center'
  }
})

// --- Resize logic ---
function onResizeStart(event: MouseEvent, direction: 'left' | 'right') {
  event.preventDefault()
  event.stopPropagation()
  isResizing.value = true
  startX.value = event.clientX
  resizeDirection.value = direction

  if (imageRef.value) {
    startWidth.value = imageRef.value.offsetWidth
  }

  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

function onResizeMove(event: MouseEvent) {
  if (!isResizing.value) return

  const diff = event.clientX - startX.value
  const multiplier = resizeDirection.value === 'right' ? 1 : -1
  const newWidth = Math.max(100, Math.round(startWidth.value + diff * multiplier))

  props.updateAttributes({ width: newWidth })
}

function onResizeEnd() {
  isResizing.value = false
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

// --- Dismiss bubble menu on outside click ---
function onDocumentMousedown(event: MouseEvent) {
  if (!props.selected) return
  const target = event.target as HTMLElement
  if (containerRef.value?.contains(target)) return
  props.editor.commands.setTextSelection(1)
  props.editor.commands.blur()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentMousedown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentMousedown)
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})

// --- Bubble menu actions ---
function setAlign(align: string) {
  props.updateAttributes({ align })
}

function toggleCaption() {
  const next = !showCaption.value
  props.updateAttributes({ showCaption: next })
  if (next) {
    nextTick(() => captionRef.value?.focus())
  }
}

function onCaptionInput(event: Event) {
  const text = (event.target as HTMLElement).textContent || ''
  props.updateAttributes({ caption: text })
}

function onCaptionKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    captionRef.value?.blur()
  }
}

function replaceImage() {
  const url = window.prompt('New image URL:')
  if (url) {
    props.updateAttributes({ src: url })
  }
}

function downloadImage() {
  const src = props.node.attrs.src
  if (!src) return
  const a = document.createElement('a')
  a.href = src
  a.download = props.node.attrs.alt || 'image'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function deleteImage() {
  props.deleteNode()
}
</script>

<template>
  <NodeViewWrapper
    class="resizable-image-wrapper"
    :style="{ justifyContent: wrapperJustify }"
  >
    <div
      ref="containerRef"
      class="resizable-image-container"
      :class="{ resizing: isResizing }"
      :style="{ width: imageWidth }"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <!-- Bubble menu — shown on click/selection -->
      <div v-show="props.selected" class="image-bubble-menu">
        <!-- Align left -->
        <button
          :class="{ active: alignment === 'left' }"
          title="Align left"
          @click.stop="setAlign('left')"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4">
            <line x1="2" y1="3" x2="2" y2="17" stroke-linecap="round"/>
            <rect x="4.5" y="5" width="9" height="10" rx="1.5" fill="currentColor" opacity="0.12"/>
            <rect x="4.5" y="5" width="9" height="10" rx="1.5"/>
          </svg>
        </button>

        <!-- Align center -->
        <button
          :class="{ active: alignment === 'center' }"
          title="Align center"
          @click.stop="setAlign('center')"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4">
            <line x1="2" y1="3" x2="2" y2="17" stroke-linecap="round"/>
            <line x1="18" y1="3" x2="18" y2="17" stroke-linecap="round"/>
            <rect x="4.5" y="5" width="11" height="10" rx="1.5" fill="currentColor" opacity="0.12"/>
            <rect x="4.5" y="5" width="11" height="10" rx="1.5"/>
          </svg>
        </button>

        <!-- Align right -->
        <button
          :class="{ active: alignment === 'right' }"
          title="Align right"
          @click.stop="setAlign('right')"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4">
            <line x1="18" y1="3" x2="18" y2="17" stroke-linecap="round"/>
            <rect x="6.5" y="5" width="9" height="10" rx="1.5" fill="currentColor" opacity="0.12"/>
            <rect x="6.5" y="5" width="9" height="10" rx="1.5"/>
          </svg>
        </button>

        <span class="bubble-sep" />

        <!-- Caption toggle -->
        <button
          :class="{ active: showCaption }"
          title="Toggle caption"
          @click.stop="toggleCaption"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="16" height="10" rx="2"/>
            <line x1="5" y1="17" x2="15" y2="17"/>
          </svg>
        </button>

        <!-- Download -->
        <button title="Download image" @click.stop="downloadImage">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 3v10"/>
            <path d="M6 10l4 4 4-4"/>
            <path d="M3 17h14"/>
          </svg>
        </button>

        <!-- Replace image -->
        <button title="Replace image" @click.stop="replaceImage">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 10a6 6 0 0 1 10.2-4.2"/>
            <path d="M16 4v4h-4"/>
            <path d="M16 10a6 6 0 0 1-10.2 4.2"/>
            <path d="M4 16v-4h4"/>
          </svg>
        </button>

        <!-- Delete -->
        <button class="delete-btn" title="Delete image" @click.stop="deleteImage">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6h12"/>
            <path d="M8 6V4h4v2"/>
            <path d="M6 6v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6"/>
            <line x1="8.5" y1="9" x2="8.5" y2="14"/>
            <line x1="11.5" y1="9" x2="11.5" y2="14"/>
          </svg>
        </button>
      </div>

      <!-- Image area with handles -->
      <div class="image-frame">
        <!-- Left resize handle -->
        <div
          v-show="isHovered || isResizing || props.selected"
          class="resize-handle left"
          @mousedown="(e) => onResizeStart(e, 'left')"
        />

        <!-- The image -->
        <img
          ref="imageRef"
          :src="node.attrs.src"
          :alt="node.attrs.alt || ''"
          :title="node.attrs.title || ''"
          draggable="false"
        />

        <!-- Right resize handle -->
        <div
          v-show="isHovered || isResizing || props.selected"
          class="resize-handle right"
          @mousedown="(e) => onResizeStart(e, 'right')"
        />
      </div>

      <!-- Caption -->
      <div v-if="showCaption" class="image-caption">
        <span
          ref="captionRef"
          class="caption-text"
          contenteditable="true"
          :data-placeholder="caption ? '' : 'Write a caption...'"
          @input="onCaptionInput"
          @keydown="onCaptionKeydown"
        >{{ caption }}</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.resizable-image-wrapper {
  display: flex;
  width: 100%;
  padding: 4px 0;
}

.resizable-image-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
  cursor: pointer;
}

/* Image + handles wrapper — clips handles to image bounds */
.image-frame {
  position: relative;
  border-radius: 4px;
  overflow: hidden;
}

.image-frame img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}

/* --- Resize handles (rounded bars inside the image) --- */
.resize-handle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 48px;
  border-radius: 3px;
  background: var(--notion-accent, #6c63ff);
  cursor: col-resize;
  z-index: 5;
  opacity: 0.85;
  transition: opacity 0.15s, height 0.15s;
}

.resize-handle:hover,
.resizing .resize-handle {
  opacity: 1;
  height: 64px;
}

.resize-handle.left {
  left: 8px;
}

.resize-handle.right {
  right: 8px;
}

/* --- Bubble menu (positioned above the container, not clipped) --- */
.image-bubble-menu {
  position: absolute;
  top: -44px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--notion-bg, #fff);
  border: 1px solid var(--notion-border, #e0e0e0);
  border-radius: 8px;
  padding: 4px 6px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 50;
  white-space: nowrap;
}

.image-bubble-menu button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: none;
  color: var(--notion-text, #333);
  transition: background 0.1s;
}

.image-bubble-menu button:hover {
  background: var(--notion-hover, #f0f0f0);
}

.image-bubble-menu button.active {
  background: var(--notion-hover, #f0f0f0);
  color: var(--notion-accent, #6c63ff);
}

.image-bubble-menu .delete-btn:hover {
  background: var(--notion-danger-hover, rgba(224, 62, 62, 0.08));
  color: var(--notion-danger, #e03e3e);
}

.bubble-sep {
  width: 1px;
  height: 20px;
  background: var(--notion-border, #e0e0e0);
  margin: 0 2px;
  flex-shrink: 0;
}

/* --- Caption --- */
.image-caption {
  padding: 6px 4px 4px;
  text-align: center;
}

.caption-text {
  display: inline-block;
  min-width: 60px;
  font-size: 13px;
  color: var(--notion-text-secondary, #787774);
  outline: none;
  border: none;
  line-height: 1.5;
}

.caption-text:empty::before {
  content: 'Write a caption...';
  color: var(--notion-drag-handle, #c4c4c2);
}
</style>

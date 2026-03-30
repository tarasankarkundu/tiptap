<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import type { Component } from 'vue'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@meldui/vue'
import {
  IconBold, IconItalic, IconUnderline, IconStrikethrough, IconCode,
  IconAlignLeft, IconAlignCenter, IconAlignRight, IconAlignJustified,
} from '@meldui/tabler-vue'

defineProps<{ editor: Editor }>()

interface BubbleItem {
  icon: Component
  label: string
  shortcut?: string
  active: boolean
  action: () => void
}

function formatItems(editor: Editor): BubbleItem[] {
  return [
    { icon: IconBold, label: 'Bold', shortcut: 'Ctrl+B', active: editor.isActive('bold'), action: () => editor.chain().focus().toggleBold().run() },
    { icon: IconItalic, label: 'Italic', shortcut: 'Ctrl+I', active: editor.isActive('italic'), action: () => editor.chain().focus().toggleItalic().run() },
    { icon: IconUnderline, label: 'Underline', shortcut: 'Ctrl+U', active: editor.isActive('underline'), action: () => editor.chain().focus().toggleUnderline().run() },
    { icon: IconStrikethrough, label: 'Strikethrough', active: editor.isActive('strike'), action: () => editor.chain().focus().toggleStrike().run() },
    { icon: IconCode, label: 'Code', active: editor.isActive('code'), action: () => editor.chain().focus().toggleCode().run() },
  ]
}

function alignItems(editor: Editor): BubbleItem[] {
  return [
    { icon: IconAlignLeft, label: 'Align left', active: editor.isActive({ textAlign: 'left' }), action: () => editor.chain().focus().setTextAlign('left').run() },
    { icon: IconAlignCenter, label: 'Align center', active: editor.isActive({ textAlign: 'center' }), action: () => editor.chain().focus().setTextAlign('center').run() },
    { icon: IconAlignRight, label: 'Align right', active: editor.isActive({ textAlign: 'right' }), action: () => editor.chain().focus().setTextAlign('right').run() },
    { icon: IconAlignJustified, label: 'Align justify', active: editor.isActive({ textAlign: 'justify' }), action: () => editor.chain().focus().setTextAlign('justify').run() },
  ]
}
</script>

<template>
  <BubbleMenu
    :editor="editor"
    :tippy-options="{ maxWidth: 'none', zIndex: 50 }"
    :should-show="({ editor: e }) => {
      if (e.isActive('image') || e.isActive('tableOfContentsNode') || e.isActive('meldChart')) return false
      return e.state.selection.content().size > 0
    }"
  >
    <TooltipProvider :delay-duration="400">
      <div class="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg">
        <template v-for="item in formatItems(editor)" :key="item.label">
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                class="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer border-0 transition-colors"
                :class="item.active ? 'bg-accent text-accent-foreground' : 'text-popover-foreground hover:bg-accent/50'"
                @click="item.action"
              >
                <component :is="item.icon" :size="16" :stroke="2" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" :side-offset="8">
              <p class="flex items-center gap-1.5">
                {{ item.label }}
                <kbd v-if="item.shortcut" class="text-xs text-muted-foreground opacity-70">{{ item.shortcut }}</kbd>
              </p>
            </TooltipContent>
          </Tooltip>
        </template>

        <div class="w-px h-5 bg-border mx-0.5" />

        <template v-for="item in alignItems(editor)" :key="item.label">
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                class="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer border-0 transition-colors"
                :class="item.active ? 'bg-accent text-accent-foreground' : 'text-popover-foreground hover:bg-accent/50'"
                @click="item.action"
              >
                <component :is="item.icon" :size="16" :stroke="2" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" :side-offset="8">
              {{ item.label }}
            </TooltipContent>
          </Tooltip>
        </template>
      </div>
    </TooltipProvider>
  </BubbleMenu>
</template>

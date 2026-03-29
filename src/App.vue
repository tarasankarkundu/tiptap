<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { MeldEditor, useThemeMode } from '@/components/editor'
import { Button } from '@meldui/vue'
import { IconSun, IconMoon } from '@meldui/tabler-vue'

const { mode, applyTheme, removeTheme } = useThemeMode()

onMounted(() => applyTheme(mode.value))
onUnmounted(() => removeTheme())

function toggleTheme() {
  applyTheme(mode.value === 'dark' ? 'light' : 'dark')
}

const content = ref(`<h2>Welcome to MeldEditor</h2>
<p>A pluggable, Notion-like rich-text editor built with tiptap and MeldUI.</p>
<p>Try these:</p>
<ul>
  <li>Type <strong>/</strong> anywhere to open the command menu</li>
  <li>Select text to see the bubble menu</li>
  <li>Hover over any block to see the drag handle on the left</li>
</ul>
<blockquote>This is a blockquote. Try inserting different block types!</blockquote>
<img src="https://picsum.photos/id/28/800/400" alt="Sample landscape" />`)
</script>

<template>
  <div class="min-h-screen bg-background p-8 transition-colors">
    <div class="mx-auto max-w-4xl">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-foreground">MeldEditor Demo</h1>
        <Button variant="ghost" size="icon" @click="toggleTheme">
          <IconSun v-if="mode === 'dark'" :size="18" />
          <IconMoon v-else :size="18" />
        </Button>
      </div>
      <MeldEditor v-model="content" />
    </div>
  </div>
</template>

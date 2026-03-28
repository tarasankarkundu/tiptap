<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { SlashCommandItem } from './slash-command-items'

const props = defineProps<{
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}>()

const selectedIndex = ref(0)

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
  },
)

const hasItems = computed(() => props.items.length > 0)

function onKeyDown(event: KeyboardEvent): boolean {
  if (event.key === 'ArrowUp') {
    selectedIndex.value =
      (selectedIndex.value + props.items.length - 1) % props.items.length
    return true
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
    return true
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }
  return false
}

function selectItem(index: number) {
  const item = props.items[index]
  if (item) {
    props.command(item)
  }
}

defineExpose({ onKeyDown })
</script>

<template>
  <div v-if="hasItems" class="slash-command-list">
    <button
      v-for="(item, index) in items"
      :key="item.title"
      class="slash-command-item"
      :class="{ 'is-selected': index === selectedIndex }"
      @click="selectItem(index)"
      @mouseenter="selectedIndex = index"
    >
      <span class="slash-command-icon">{{ item.icon }}</span>
      <div class="slash-command-text">
        <span class="slash-command-title">{{ item.title }}</span>
        <span class="slash-command-description">{{ item.description }}</span>
      </div>
    </button>
  </div>
  <div v-else class="slash-command-list slash-command-empty">
    No results
  </div>
</template>

<style scoped>
.slash-command-list {
  background: var(--notion-slash-bg, #fff);
  border-radius: 8px;
  box-shadow: var(--notion-slash-shadow, 0 1px 6px rgba(0, 0, 0, 0.12));
  padding: 4px;
  min-width: 240px;
  max-height: 320px;
  overflow-y: auto;
}

.slash-command-empty {
  padding: 12px 16px;
  color: var(--notion-text-secondary, #787774);
  font-size: 13px;
}

.slash-command-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  color: var(--notion-text, #37352f);
  font-size: 14px;
}

.slash-command-item:hover,
.slash-command-item.is-selected {
  background: var(--notion-hover, #f1f1ef);
}

.slash-command-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--notion-code-bg, #f7f6f3);
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.slash-command-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.slash-command-title {
  font-weight: 500;
  line-height: 1.3;
}

.slash-command-description {
  font-size: 12px;
  color: var(--notion-text-secondary, #787774);
  line-height: 1.3;
}
</style>

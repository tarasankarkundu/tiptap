<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, Button,
} from '@meldui/vue'
import type { DeleteDialogItem } from '../types'

const props = defineProps<{ open: boolean; items: DeleteDialogItem[] }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()

function onConfirm() {
  emit('confirm')
  emit('update:open', false)
}

const totalCount = computed(() => props.items.reduce((sum, i) => sum + i.count, 0))
const isSingleType = computed(() => props.items.length === 1)
const isSingleBlock = computed(() => isSingleType.value && props.items[0]?.count === 1)
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-sm" @mousedown.stop>
      <DialogHeader>
        <DialogTitle>
          <template v-if="isSingleBlock">Delete this {{ items[0]?.name }}?</template>
          <template v-else-if="isSingleType">Delete {{ items[0]?.count }} {{ items[0]?.name }} blocks?</template>
          <template v-else>Delete {{ totalCount }} blocks?</template>
        </DialogTitle>
        <DialogDescription as="div">
          <template v-if="isSingleBlock">
            This will remove the {{ items[0]?.name }} block and all its data. This action cannot be undone.
          </template>
          <template v-else-if="isSingleType">
            This will remove {{ items[0]?.count }} {{ items[0]?.name }} blocks and all their data. This action cannot be undone.
          </template>
          <template v-else>
            <p>This will remove:</p>
            <ul class="my-2 list-disc pl-5">
              <li v-for="item in items" :key="item.name">
                {{ item.count }} {{ item.name }} {{ item.count === 1 ? 'block' : 'blocks' }}
              </li>
            </ul>
            <p>This action cannot be undone.</p>
          </template>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost" @click="emit('update:open', false)">Cancel</Button>
        <Button variant="destructive" @click="onConfirm">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

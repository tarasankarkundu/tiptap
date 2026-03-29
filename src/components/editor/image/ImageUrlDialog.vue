<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@meldui/vue'
import { Button } from '@meldui/vue'
import { Input } from '@meldui/vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [url: string]
}>()

const url = ref('')

watch(() => props.open, (val) => {
  if (val) url.value = ''
})

function onSubmit() {
  const trimmed = url.value.trim()
  if (trimmed) {
    emit('submit', trimmed)
    url.value = ''
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Insert Image</DialogTitle>
        <DialogDescription>Enter the URL of the image to insert.</DialogDescription>
      </DialogHeader>
      <Input
        v-model="url"
        placeholder="https://example.com/image.jpg"
        @keydown.enter="onSubmit"
      />
      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="!url.trim()" @click="onSubmit">Insert</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

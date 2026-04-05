<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, Button, Input,
} from '@meldui/vue'
import { IconPlus, IconX } from '@meldui/tabler-vue'

defineProps<{ open: boolean }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'create': [data: { question: string; options: string[]; multiSelect: boolean }]
}>()

const question = ref('What do you think?')
const options = ref(['Option 1', 'Option 2', 'Option 3'])
const multiSelect = ref(false)

const canCreate = computed(() =>
  question.value.trim().length > 0 &&
  options.value.filter(o => o.trim().length > 0).length >= 2,
)

function addOption() {
  options.value.push('')
}

function removeOption(index: number) {
  if (options.value.length <= 2) return
  options.value.splice(index, 1)
}

function onCreate() {
  const validOptions = options.value.filter(o => o.trim().length > 0)
  if (validOptions.length < 2) return
  emit('create', {
    question: question.value.trim(),
    options: validOptions.map(o => o.trim()),
    multiSelect: multiSelect.value,
  })
  // Reset for next use
  question.value = 'What do you think?'
  options.value = ['Option 1', 'Option 2', 'Option 3']
  multiSelect.value = false
}

function onClose(open: boolean) {
  emit('update:open', open)
}
</script>

<template>
  <Dialog :open="open" @update:open="onClose">
    <DialogContent class="sm:max-w-md" @mousedown.stop>
      <DialogHeader>
        <DialogTitle>Create Poll</DialogTitle>
        <DialogDescription>Set up your poll question and options.</DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <!-- Question -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">Question</label>
          <Input v-model="question" placeholder="Enter your question..." />
        </div>

        <!-- Options -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">Options</label>
          <div class="space-y-2">
            <div
              v-for="(_, index) in options"
              :key="index"
              class="flex items-center gap-2"
            >
              <Input
                v-model="options[index]"
                :placeholder="`Option ${index + 1}`"
                class="flex-1"
              />
              <Button
                v-if="options.length > 2"
                variant="ghost"
                size="icon-sm"
                class="text-muted-foreground hover:text-destructive shrink-0"
                @click="removeOption(index)"
              >
                <IconX :size="14" />
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            class="mt-2"
            @click="addOption"
          >
            <IconPlus :size="14" class="mr-1" />
            Add option
          </Button>
        </div>

        <!-- Multi-select toggle -->
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="multiSelect"
            type="checkbox"
            class="rounded border-border"
          />
          <span class="text-sm text-foreground">Allow multiple selections</span>
        </label>
      </div>

      <DialogFooter>
        <Button variant="ghost" @click="onClose(false)">Cancel</Button>
        <Button :disabled="!canCreate" @click="onCreate">Create Poll</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

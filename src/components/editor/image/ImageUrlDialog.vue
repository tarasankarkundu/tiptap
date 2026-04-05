<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@meldui/vue'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@meldui/vue'
import { Button } from '@meldui/vue'
import { Input } from '@meldui/vue'
import { IconUpload, IconLink, IconLoader2 } from '@meldui/tabler-vue'

const props = defineProps<{
  open: boolean
  onUpload?: (file: File) => Promise<string>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [url: string]
}>()

const url = ref('')
const uploading = ref(false)
const uploadError = ref('')
const activeTab = ref(props.onUpload ? 'upload' : 'link')

watch(() => props.open, (val) => {
  if (val) {
    url.value = ''
    uploading.value = false
    uploadError.value = ''
    activeTab.value = props.onUpload ? 'upload' : 'link'
  }
})

function onUrlSubmit() {
  const trimmed = url.value.trim()
  if (trimmed) {
    emit('submit', trimmed)
    url.value = ''
  }
}

async function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!props.onUpload) {
    // No upload handler — use base64 as fallback
    const reader = new FileReader()
    reader.onload = () => {
      emit('submit', reader.result as string)
    }
    reader.readAsDataURL(file)
    return
  }

  uploading.value = true
  uploadError.value = ''
  try {
    const imageUrl = await props.onUpload(file)
    emit('submit', imageUrl)
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    uploading.value = false
    input.value = ''
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Add Image</DialogTitle>
        <DialogDescription>Upload a file or paste an image URL.</DialogDescription>
      </DialogHeader>

      <Tabs v-model="activeTab">
        <TabsList class="w-full">
          <TabsTrigger value="upload" class="flex-1 gap-1.5">
            <IconUpload :size="14" /> Upload
          </TabsTrigger>
          <TabsTrigger value="link" class="flex-1 gap-1.5">
            <IconLink :size="14" /> Link
          </TabsTrigger>
        </TabsList>

        <!-- Upload tab -->
        <TabsContent value="upload" class="mt-4">
          <label
            class="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/30"
            :class="{ 'opacity-50 pointer-events-none': uploading }"
          >
            <IconUpload v-if="!uploading" :size="24" class="text-muted-foreground" />
            <IconLoader2 v-else :size="24" class="text-muted-foreground animate-spin" />
            <span class="text-sm text-muted-foreground">
              {{ uploading ? 'Uploading...' : 'Click to select or drag an image' }}
            </span>
            <span class="text-xs text-muted-foreground/60">PNG, JPG, GIF, WebP</span>
            <input
              type="file"
              accept="image/*"
              class="hidden"
              :disabled="uploading"
              @change="onFileSelect"
            />
          </label>
          <p v-if="uploadError" class="mt-2 text-sm text-destructive">{{ uploadError }}</p>
        </TabsContent>

        <!-- Link tab -->
        <TabsContent value="link" class="mt-4 space-y-3">
          <Input
            v-model="url"
            placeholder="https://example.com/image.jpg"
            @keydown.enter="onUrlSubmit"
          />
          <DialogFooter>
            <Button variant="outline" @click="emit('update:open', false)">Cancel</Button>
            <Button :disabled="!url.trim()" @click="onUrlSubmit">Insert</Button>
          </DialogFooter>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>

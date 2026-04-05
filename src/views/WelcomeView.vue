<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@meldui/vue'
import { IconFilePlus } from '@meldui/tabler-vue'
import { useDocumentStore } from '@/composables/useDocumentStore'

const router = useRouter()
const { createDocument } = useDocumentStore()

function handleCreate() {
    const doc = createDocument()
    router.push({ name: 'document-edit', params: { id: doc.id } })
}
</script>

<template>
    <div class="flex h-full items-center justify-center">
        <div class="text-center">
            <h1 class="text-2xl font-semibold text-foreground mb-2">
                Welcome to MeldEditor
            </h1>
            <p class="text-muted-foreground mb-6">
                Create a document to get started.
            </p>
            <Button @click="handleCreate">
                <IconFilePlus :size="18" class="mr-2" />
                Create a document
            </Button>
        </div>
    </div>
</template>

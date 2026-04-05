<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Editor } from '@tiptap/core'
import { MeldEditor } from '@/components/editor'
import DocumentHeader from '@/components/documents/DocumentHeader.vue'
import { useDocumentStore } from '@/composables/useDocumentStore'
import { useEditorConfig } from '@/composables/useEditorConfig'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { getDocument } = useDocumentStore()
const { customComponents, searchMentions } = useEditorConfig()

const doc = computed(() => getDocument(props.id))

if (!doc.value) {
    router.replace({ name: 'welcome' })
}

function onEditorCreated(editor: Editor) {
    if (doc.value) {
        editor.commands.setContent(doc.value.content)
    }
}

function handleEdit() {
    router.push({ name: 'document-edit', params: { id: props.id } })
}
</script>

<template>
    <div v-if="doc" class="h-full">
        <DocumentHeader
            mode="view"
            :title="doc.title"
            @edit="handleEdit"
        />
        <MeldEditor
            :editable="false"
            :show-toolbar="false"
            :show-bubble-menu="false"
            :custom-components="customComponents"
            :on-mention-search="searchMentions"
            editor-class="mx-auto max-w-5xl"
            @created="onEditorCreated"
        />
    </div>
</template>

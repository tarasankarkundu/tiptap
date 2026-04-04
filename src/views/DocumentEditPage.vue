<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Editor } from '@tiptap/core'
import { MeldEditor } from '@/components/editor'
import DocumentHeader from '@/components/documents/DocumentHeader.vue'
import { useDocumentStore } from '@/composables/useDocumentStore'
import { useEditorConfig } from '@/composables/useEditorConfig'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { getDocument, updateDocument } = useDocumentStore()
const { customComponents, searchMentions } = useEditorConfig()

const doc = getDocument(props.id)
if (!doc) {
    router.replace({ name: 'welcome' })
}

const localTitle = ref(doc?.title ?? 'Untitled')
const localJSON = ref<Record<string, unknown>>(doc?.content ?? {})
const titleManuallyEdited = ref(false)

function extractTitle(json: Record<string, unknown>): string {
    const content = json.content as Array<Record<string, unknown>> | undefined
    if (!content) return ''

    const target =
        content.find((n) => n.type === 'heading') ??
        content.find((n) => n.type === 'paragraph')
    if (!target) return ''

    const nodes = target.content as Array<Record<string, unknown>> | undefined
    if (!nodes) return ''

    return nodes
        .filter((n) => n.type === 'text')
        .map((n) => n.text as string)
        .join('')
}

watch(localJSON, (json) => {
    if (titleManuallyEdited.value) return
    const extracted = extractTitle(json)
    if (extracted) {
        localTitle.value = extracted
    }
})

function onEditorCreated(editor: Editor) {
    if (doc) {
        editor.commands.setContent(doc.content)
    }
}

function handleUpdateJson(json: Record<string, unknown>) {
    localJSON.value = json
}

function handleTitleUpdate(value: string) {
    titleManuallyEdited.value = true
    localTitle.value = value
}

function handleSave() {
    updateDocument(props.id, {
        title: localTitle.value,
        content: localJSON.value,
    })
    router.push({ name: 'document-view', params: { id: props.id } })
}

function handleClose() {
    router.push({ name: 'document-view', params: { id: props.id } })
}
</script>

<template>
    <div v-if="doc" class="h-full">
        <DocumentHeader
            mode="edit"
            :title="localTitle"
            @update:title="handleTitleUpdate"
            @save="handleSave"
            @close="handleClose"
        />
        <MeldEditor
            :editable="true"
            :show-toolbar="false"
            :custom-components="customComponents"
            :on-mention-search="searchMentions"
            editor-class="mx-auto max-w-5xl"
            @created="onEditorCreated"
            @update:json="handleUpdateJson"
        />
    </div>
</template>

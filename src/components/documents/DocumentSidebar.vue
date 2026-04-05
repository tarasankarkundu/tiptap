<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuAction,
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
    Button,
} from '@meldui/vue'
import {
    IconFilePlus,
    IconFileText,
    IconTrash,
    IconSun,
    IconMoon,
} from '@meldui/tabler-vue'
import { useDocumentStore } from '@/composables/useDocumentStore'
import { useThemeMode } from '@/composables/useThemeMode'

const route = useRoute()
const router = useRouter()
const { allDocuments, createDocument, deleteDocument } = useDocumentStore()
const { mode, applyTheme } = useThemeMode()

const deleteTargetId = ref<string | null>(null)
const deleteDialogOpen = ref(false)

function toggleTheme() {
    applyTheme(mode.value === 'dark' ? 'light' : 'dark')
}

function handleCreate() {
    const doc = createDocument()
    router.push({ name: 'document-edit', params: { id: doc.id } })
}

function confirmDelete(id: string) {
    deleteTargetId.value = id
    deleteDialogOpen.value = true
}

function handleDelete() {
    if (!deleteTargetId.value) return
    const wasActive = route.params.id === deleteTargetId.value
    deleteDocument(deleteTargetId.value)
    deleteTargetId.value = null
    deleteDialogOpen.value = false
    if (wasActive) {
        router.push({ name: 'welcome' })
    }
}
</script>

<template>
    <Sidebar>
        <SidebarHeader>
            <div class="flex items-center justify-between px-2 py-1">
                <span class="text-sm font-semibold text-sidebar-foreground">
                    MeldEditor
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7"
                    @click="toggleTheme"
                >
                    <IconSun v-if="mode === 'dark'" :size="16" />
                    <IconMoon v-else :size="16" />
                </Button>
            </div>
        </SidebarHeader>

        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupLabel>Documents</SidebarGroupLabel>
                <SidebarGroupAction @click="handleCreate">
                    <IconFilePlus :size="16" />
                </SidebarGroupAction>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem
                            v-for="doc in allDocuments"
                            :key="doc.id"
                        >
                            <SidebarMenuButton
                                :is-active="route.params.id === doc.id"
                                @click="
                                    router.push({
                                        name: 'document-view',
                                        params: { id: doc.id },
                                    })
                                "
                            >
                                <IconFileText :size="16" />
                                <span class="truncate">{{ doc.title }}</span>
                            </SidebarMenuButton>
                            <SidebarMenuAction
                                @click.stop="confirmDelete(doc.id)"
                            >
                                <IconTrash :size="16" />
                            </SidebarMenuAction>
                        </SidebarMenuItem>

                        <div
                            v-if="allDocuments.length === 0"
                            class="px-3 py-4 text-center text-xs text-muted-foreground"
                        >
                            No documents yet.
                            <br />
                            Click + to create one.
                        </div>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>

    </Sidebar>

    <AlertDialog v-model:open="deleteDialogOpen">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete document?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. The document will be
                    permanently removed.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction @click="handleDelete">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>

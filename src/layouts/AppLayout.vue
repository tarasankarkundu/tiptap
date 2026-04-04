<script setup lang="ts">
import { SidebarProvider, SidebarInset } from '@meldui/vue'
import DocumentSidebar from '@/components/documents/DocumentSidebar.vue'
</script>

<template>
    <SidebarProvider :default-open="true">
        <DocumentSidebar />
        <SidebarInset>
            <slot />
        </SidebarInset>
    </SidebarProvider>
</template>

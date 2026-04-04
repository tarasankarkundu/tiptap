<script setup lang="ts">
import { Button, Input } from '@meldui/vue'
import { IconDeviceFloppy, IconX, IconEdit } from '@meldui/tabler-vue'

defineProps<{
    mode: 'view' | 'edit'
    title: string
}>()

defineEmits<{
    save: []
    close: []
    edit: []
    'update:title': [value: string]
}>()
</script>

<template>
    <div
        class="flex items-center justify-between border-b border-border px-4 py-2"
    >
        <template v-if="mode === 'edit'">
            <Input
                :model-value="title"
                placeholder="Document title"
                class="max-w-md border-0 bg-transparent text-base font-semibold shadow-none focus-visible:ring-0"
                @update:model-value="$emit('update:title', String($event))"
            />
            <div class="flex items-center gap-2">
                <Button size="sm" @click="$emit('save')">
                    <IconDeviceFloppy :size="16" class="mr-1" />
                    Save
                </Button>
                <Button variant="ghost" size="sm" @click="$emit('close')">
                    <IconX :size="16" class="mr-1" />
                    Close
                </Button>
            </div>
        </template>

        <template v-else>
            <h1 class="text-base font-semibold text-foreground truncate">
                {{ title }}
            </h1>
            <Button size="sm" @click="$emit('edit')">
                <IconEdit :size="16" class="mr-1" />
                Edit
            </Button>
        </template>
    </div>
</template>

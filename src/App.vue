<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useThemeMode } from '@/components/editor'
import AppLayout from '@/layouts/AppLayout.vue'

const { mode, applyTheme, removeTheme } = useThemeMode()

onMounted(() => applyTheme(mode.value))
onUnmounted(() => removeTheme())
</script>

<template>
    <AppLayout>
        <RouterView :key="$route.fullPath" />
    </AppLayout>
</template>

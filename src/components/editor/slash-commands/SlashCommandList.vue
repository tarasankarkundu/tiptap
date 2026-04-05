<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import type { SlashCommandItem } from "../types";
import { ScrollArea, ScrollBar } from "@meldui/vue";

const props = defineProps<{
    items: SlashCommandItem[];
    command: (item: SlashCommandItem) => void;
}>();

const selectedIndex = ref(0);
const itemRefs = ref<HTMLElement[]>([]);

watch(
    () => props.items,
    () => {
        selectedIndex.value = 0;
    },
);

watch(selectedIndex, () => {
    nextTick(() => {
        itemRefs.value[selectedIndex.value]?.scrollIntoView({ block: "nearest" });
    });
});

function selectItem(index: number) {
    const item = props.items[index];
    if (item) props.command(item);
}

function onKeyDown(event: KeyboardEvent): boolean {
    if (event.key === "ArrowUp") {
        selectedIndex.value =
            (selectedIndex.value + props.items.length - 1) % props.items.length;
        return true;
    }
    if (event.key === "ArrowDown") {
        selectedIndex.value = (selectedIndex.value + 1) % props.items.length;
        return true;
    }
    if (event.key === "Enter") {
        selectItem(selectedIndex.value);
        return true;
    }
    return false;
}

defineExpose({ onKeyDown });
</script>

<template>
    <div
        v-if="items.length"
        class="min-w-60 rounded-lg border border-border bg-popover p-1 shadow-lg"
    >
        <ScrollArea class="slash-scroll">
            <div class="flex flex-col">
                <button
                    v-for="(item, index) in items"
                    :key="item.title"
                    :ref="(el) => { if (el) itemRefs[index] = el as HTMLElement }"
                    class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-popover-foreground transition-colors"
                    :class="
                        index === selectedIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent/50'
                    "
                    @click="selectItem(index)"
                    @mouseenter="selectedIndex = index"
                >
                    <span
                        class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground"
                    >
                        <component
                            v-if="typeof item.icon !== 'string'"
                            :is="item.icon"
                            :size="16"
                        />
                        <span v-else class="text-xs font-semibold">{{
                            item.icon
                        }}</span>
                    </span>
                    <div class="flex flex-col items-start">
                        <span class="font-medium leading-tight">{{
                            item.title
                        }}</span>
                        <span
                            class="text-xs text-muted-foreground leading-tight"
                            >{{ item.description }}</span
                        >
                    </div>
                </button>
            </div>
            <ScrollBar />
        </ScrollArea>
    </div>
    <div
        v-else
        class="rounded-lg border border-border bg-popover px-4 py-3 text-sm text-muted-foreground shadow-lg"
    >
        No results
    </div>
</template>

<style scoped>
.slash-scroll :deep([data-slot="scroll-area-viewport"]) {
    max-height: 20rem;
}
</style>

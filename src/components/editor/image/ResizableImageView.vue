<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { nodeViewProps, NodeViewWrapper } from "@tiptap/vue-3";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@meldui/vue";
import {
    IconAlignLeft,
    IconAlignCenter,
    IconAlignRight,
    IconTypography,
    IconDownload,
    IconReplace,
    IconTrash,
} from "@meldui/tabler-vue";

const props = defineProps(nodeViewProps);

const isHovered = ref(false);
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);
const resizeDirection = ref<"left" | "right">("right");
const imageRef = ref<HTMLImageElement | null>(null);
const captionRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);

const imageWidth = computed(() => {
    const w = props.node.attrs.width;
    return w ? `${w}px` : "100%";
});

const alignment = computed(() => props.node.attrs.align || "center");
const caption = computed(() => props.node.attrs.caption || "");
const showCaption = computed(() => props.node.attrs.showCaption);

const wrapperJustify = computed(() => {
    switch (alignment.value) {
        case "left":
            return "flex-start";
        case "right":
            return "flex-end";
        default:
            return "center";
    }
});

// --- Resize ---
function onResizeStart(event: MouseEvent, direction: "left" | "right") {
    event.preventDefault();
    event.stopPropagation();
    isResizing.value = true;
    startX.value = event.clientX;
    resizeDirection.value = direction;
    if (imageRef.value) startWidth.value = imageRef.value.offsetWidth;
    document.addEventListener("mousemove", onResizeMove);
    document.addEventListener("mouseup", onResizeEnd);
}

function onResizeMove(event: MouseEvent) {
    if (!isResizing.value) return;
    const diff = event.clientX - startX.value;
    const multiplier = resizeDirection.value === "right" ? 1 : -1;
    const newWidth = Math.max(
        100,
        Math.round(startWidth.value + diff * multiplier),
    );
    props.updateAttributes({ width: newWidth });
}

function onResizeEnd() {
    isResizing.value = false;
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", onResizeEnd);
}

// --- Dismiss on outside click ---
function onDocumentMousedown(event: MouseEvent) {
    if (!props.selected) return;
    if (containerRef.value?.contains(event.target as HTMLElement)) return;
    props.editor.commands.setTextSelection(1);
    props.editor.commands.blur();
}

onMounted(() => {
    document.addEventListener("mousedown", onDocumentMousedown);
});

onBeforeUnmount(() => {
    document.removeEventListener("mousedown", onDocumentMousedown);
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", onResizeEnd);
});

// --- Actions ---
function setAlign(align: string) {
    props.updateAttributes({ align });
}

function toggleCaption() {
    const next = !showCaption.value;
    props.updateAttributes({ showCaption: next });
    if (next) nextTick(() => captionRef.value?.focus());
}

function onCaptionInput(event: Event) {
    props.updateAttributes({
        caption: (event.target as HTMLElement).textContent || "",
    });
}

function onCaptionKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
        event.preventDefault();
        captionRef.value?.blur();
    }
}

function replaceImage() {
    const onRequest = props.extension.options.onRequestImageUrl;
    if (onRequest) {
        onRequest((url: string) => props.updateAttributes({ src: url }));
    } else {
        const url = window.prompt("New image URL:");
        if (url) props.updateAttributes({ src: url });
    }
}

function downloadImage() {
    const src = props.node.attrs.src;
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = props.node.attrs.alt || "image";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
</script>

<template>
    <NodeViewWrapper
        class="flex w-full py-1"
        :style="{ justifyContent: wrapperJustify }"
    >
        <div
            ref="containerRef"
            class="relative inline-block max-w-full cursor-pointer"
            :class="{ resizing: isResizing }"
            :style="{ width: imageWidth }"
            @mouseenter="isHovered = true"
            @mouseleave="isHovered = false"
        >
            <!-- Bubble menu -->
            <div
                v-show="props.selected"
                class="absolute -top-11 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg whitespace-nowrap"
            >
                <TooltipProvider :delay-duration="400">
                    <template
                        v-for="a in [
                            {
                                align: 'left',
                                icon: IconAlignLeft,
                                label: 'Align left',
                            },
                            {
                                align: 'center',
                                icon: IconAlignCenter,
                                label: 'Align center',
                            },
                            {
                                align: 'right',
                                icon: IconAlignRight,
                                label: 'Align right',
                            },
                        ]"
                        :key="a.align"
                    >
                        <Tooltip>
                            <TooltipTrigger as-child>
                                <button
                                    class="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer border-0 transition-colors"
                                    :class="
                                        alignment === a.align
                                            ? 'bg-accent text-accent-foreground'
                                            : 'text-popover-foreground hover:bg-accent/50'
                                    "
                                    @click.stop="setAlign(a.align)"
                                >
                                    <component
                                        :is="a.icon"
                                        :size="16"
                                        :stroke="1.5"
                                    />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent
                                side="top"
                                :side-offset="8"
                                class="z-[999]"
                                >{{ a.label }}</TooltipContent
                            >
                        </Tooltip>
                    </template>

                    <div class="w-px h-5 bg-border mx-0.5" />

                    <Tooltip>
                        <TooltipTrigger as-child>
                            <button
                                class="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer border-0 transition-colors"
                                :class="
                                    showCaption
                                        ? 'bg-accent text-accent-foreground'
                                        : 'text-popover-foreground hover:bg-accent/50'
                                "
                                @click.stop="toggleCaption"
                            >
                                <IconTypography :size="16" :stroke="1.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" :side-offset="8"
                            >Caption</TooltipContent
                        >
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <button
                                class="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer border-0 text-popover-foreground hover:bg-accent/50 transition-colors"
                                @click.stop="downloadImage"
                            >
                                <IconDownload :size="16" :stroke="1.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" :side-offset="8"
                            >Download</TooltipContent
                        >
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <button
                                class="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer border-0 text-popover-foreground hover:bg-accent/50 transition-colors"
                                @click.stop="replaceImage"
                            >
                                <IconReplace :size="16" :stroke="1.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" :side-offset="8"
                            >Replace image</TooltipContent
                        >
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <button
                                class="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer border-0 text-destructive hover:bg-destructive/10 transition-colors"
                                @click.stop="deleteNode"
                            >
                                <IconTrash :size="16" :stroke="1.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" :side-offset="8"
                            >Delete</TooltipContent
                        >
                    </Tooltip>
                </TooltipProvider>
            </div>

            <!-- Image frame (overflow hidden clips resize handles to image bounds) -->
            <div class="relative rounded-md overflow-hidden">
                <div
                    v-show="isHovered || isResizing || props.selected"
                    class="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-1.5 h-12 rounded-full bg-primary opacity-80 cursor-col-resize hover:opacity-100 hover:h-16 transition-all"
                    @mousedown="(e) => onResizeStart(e, 'left')"
                />
                <img
                    ref="imageRef"
                    :src="node.attrs.src"
                    :alt="node.attrs.alt || ''"
                    :title="node.attrs.title || ''"
                    class="block w-full h-auto select-none"
                    draggable="false"
                />
                <div
                    v-show="isHovered || isResizing || props.selected"
                    class="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-1.5 h-12 rounded-full bg-primary opacity-80 cursor-col-resize hover:opacity-100 hover:h-16 transition-all"
                    @mousedown="(e) => onResizeStart(e, 'right')"
                />
            </div>

            <!-- Caption -->
            <div v-if="showCaption" class="pt-1.5 text-center">
                <span
                    ref="captionRef"
                    class="inline-block min-w-15 text-sm text-muted-foreground outline-none leading-relaxed"
                    contenteditable="true"
                    @input="onCaptionInput"
                    @keydown="onCaptionKeydown"
                    >{{ caption }}</span
                >
                <span
                    v-if="!caption"
                    class="text-sm text-muted-foreground/50 pointer-events-none absolute left-1/2 -translate-x-1/2"
                    >Write a caption...</span
                >
            </div>
        </div>
    </NodeViewWrapper>
</template>

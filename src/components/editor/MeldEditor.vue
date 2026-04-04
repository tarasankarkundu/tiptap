<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import type {
    MeldEditorProps,
    MeldEditorEmits,
    MeldEditorExposed,
} from "./types";
import {
    createDefaultExtensions,
    createDefaultToolbarItems,
    resolveSlashCommands,
} from "./defaults";
import EditorToolbar from "./toolbar/EditorToolbar.vue";
import TextBubbleMenu from "./bubble-menu/TextBubbleMenu.vue";
import TableControls from "./table/TableControls.vue";
import DragHandle from "./drag-handle/DragHandle.vue";
import ImageUrlDialog from "./image/ImageUrlDialog.vue";
import { createCustomNodeExtension } from "./custom-components/CustomNodeExtension";
import type { SlashCommandItem } from "./types";

const props = withDefaults(defineProps<MeldEditorProps>(), {
    modelValue: "",
    showToolbar: false,
    showBubbleMenu: true,
    editable: true,
    placeholder: "Write, type '/' for commands\u2026",
    editorClass: "",
});

const emit = defineEmits<MeldEditorEmits>();

// Image dialog state
const imageDialogOpen = ref(false);
const imageDialogCallback = ref<((url: string) => void) | null>(null);

function openImageDialog(callback?: (url: string) => void) {
    imageDialogCallback.value =
        callback ??
        ((u: string) => {
            editor.value?.chain().focus().setImage({ src: u }).run();
        });
    imageDialogOpen.value = true;
}

function onImageDialogSubmit(url: string) {
    imageDialogCallback.value?.(url);
    imageDialogCallback.value = null;
    imageDialogOpen.value = false;
}

// Custom component extensions and slash commands (Phase 2)
const customExtensions = computed(() =>
    (props.customComponents ?? []).map((reg) => createCustomNodeExtension(reg)),
);

const customSlashCommands = computed<SlashCommandItem[]>(() =>
    (props.customComponents ?? [])
        .filter((reg) => reg.slashCommand)
        .map((reg) => ({
            title: reg.slashCommand!.title,
            description: reg.slashCommand!.description,
            icon: reg.slashCommand!.icon,
            category: reg.slashCommand!.category,
            keywords: reg.slashCommand!.keywords,
            command: (editor: Parameters<SlashCommandItem["command"]>[0]) => {
                editor
                    .chain()
                    .focus()
                    .insertContent({
                        type: reg.name,
                        attrs: reg.slashCommand!.defaultAttrs ?? {},
                    })
                    .run();
            },
        })),
);

// Resolve slash commands
const resolvedSlashCommands = computed(() => {
    const base = resolveSlashCommands({
        override: props.overrideSlashCommands,
        extra: props.extraSlashCommands,
        disable: props.disableSlashCommands,
        onImageInsert: () => openImageDialog(),
    });
    return [...base, ...customSlashCommands.value];
});

// Resolve toolbar items
const resolvedToolbarItems = computed(
    () => props.toolbarItems ?? createDefaultToolbarItems(),
);

// Resolve extensions
const resolvedExtensions = computed(() => {
    if (props.overrideExtensions)
        return [...props.overrideExtensions, ...customExtensions.value];
    const defaults = createDefaultExtensions({
        defaults: props.defaultExtensions,
        placeholder: props.placeholder,
        slashCommands: resolvedSlashCommands.value,
        onRequestImageUrl: (cb) => openImageDialog(cb),
        onMentionSearch: props.onMentionSearch,
    });
    const extra = props.extraExtensions ?? [];
    return [...defaults, ...extra, ...customExtensions.value];
});

// Create editor
const editor = useEditor({
    content: props.modelValue,
    extensions: resolvedExtensions.value,
    editable: props.editable,
    onUpdate: ({ editor: e }) => {
        emit("update:modelValue", e.getHTML());
        emit("update:json", e.getJSON());
    },
    onCreate: ({ editor: e }) => emit("created", e),
    onFocus: ({ event }) => emit("focus", event),
    onBlur: ({ event }) => emit("blur", event),
});

// Watch external content changes
watch(
    () => props.modelValue,
    (newVal) => {
        if (editor.value && newVal !== editor.value.getHTML()) {
            editor.value.commands.setContent(newVal ?? "");
        }
    },
);

// Watch editable changes
watch(
    () => props.editable,
    (val) => {
        editor.value?.setEditable(val);
    },
);

// Refs
const editorBodyRef = ref<HTMLElement | null>(null);
const dragHandleRef = ref<InstanceType<typeof DragHandle> | null>(null);

// Expose
defineExpose<MeldEditorExposed>({
    editor: editor.value,
    getHTML: () => editor.value?.getHTML() ?? "",
    getJSON: () => editor.value?.getJSON() ?? {},
    setContent: (content: string) => {
        editor.value?.commands.setContent(content);
    },
    focus: () => {
        editor.value?.commands.focus();
    },
    blur: () => {
        editor.value?.commands.blur();
    },
});
</script>

<template>
    <div
        data-meld-editor
        class="w-full h-full bg-background text-foreground transition-colors"
        :class="editorClass"
    >
        <!-- Header slot (app-level action bar) -->
        <slot name="header" :editor="editor" :editable="editable" />

        <!-- Toolbar slot -->
        <slot name="toolbar" :editor="editor" :items="resolvedToolbarItems">
            <EditorToolbar
                v-if="showToolbar && editor"
                :editor="editor"
                :items="resolvedToolbarItems"
            />
        </slot>

        <slot name="before-content" :editor="editor" />

        <div
            ref="editorBodyRef"
            class="relative w-full"
            style="padding-left: 56px; padding-right: 16px"
            @mousemove="dragHandleRef?.handleMouseMove($event)"
            @mouseleave="dragHandleRef?.handleMouseLeave()"
        >
            <!-- Drag handle -->
            <DragHandle
                v-if="editor"
                ref="dragHandleRef"
                :editor="editor"
                :container-el="editorBodyRef"
            />

            <EditorContent :editor="editor" />

            <!-- Bubble menu slot -->
            <slot name="bubble-menu" :editor="editor">
                <TextBubbleMenu
                    v-if="showBubbleMenu && editor"
                    :editor="editor"
                />
            </slot>

            <!-- Table controls -->
            <TableControls
                v-if="editor"
                :editor="editor"
                :container-el="editorBodyRef"
            />
        </div>

        <slot name="after-content" :editor="editor" />

        <!-- Image URL Dialog -->
        <ImageUrlDialog
            :open="imageDialogOpen"
            :on-upload="props.onImageUpload"
            @update:open="imageDialogOpen = $event"
            @submit="onImageDialogSubmit"
        />
    </div>
</template>

<style scoped>
/* Bubble menu — wrapper z-index must beat table-controls (z-index: 15) */
:deep([tippy-options]) {
    z-index: 50 !important;
}

/* ── Editor container ── */
:deep(.tiptap) {
    padding: 1rem 1rem 1rem 0;
    outline: none;
    font-size: 1rem;
    line-height: 1.625;
}

:deep(.tiptap .ProseMirror-selectednode) {
    outline: none !important;
}

/* Notion-like block highlight for cross-block selections.
   Uses ::after overlay so it covers opaque content (images, charts, polls). */
:deep(.tiptap .block-selected) {
    position: relative;
}

:deep(.tiptap .block-selected)::after {
    content: "";
    position: absolute;
    inset: 0;
    background-color: color-mix(in srgb, var(--primary) 20%, transparent);
    border-radius: 4px;
    pointer-events: none;
    z-index: 2;
}

/* Hide per-node inline toolbars (bubble menus) during block selection.
   All node-view bubble menus are absolutely positioned z-50 inside their wrapper. */
:deep(.tiptap:has(.block-selected)) [data-node-view-wrapper] .absolute.z-50 {
    display: none !important;
}

/* Suppress native text selection highlight when block selection is active */
:deep(.tiptap:has(.block-selected)) *::selection {
    background: transparent;
}

:deep(.tiptap:has(.block-selected)) {
    caret-color: transparent;
}

/* ── Paragraphs ── */
:deep(.tiptap p) {
    margin: 0.75rem 0;
}

:deep(.tiptap p:first-child) {
    margin-top: 0;
}

:deep(.tiptap p:last-child) {
    margin-bottom: 0;
}

/* ── Headings ── */
:deep(.tiptap h1) {
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.2;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
}

:deep(.tiptap h2) {
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.25;
    margin-top: 1.75rem;
    margin-bottom: 0.5rem;
}

:deep(.tiptap h3) {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.3;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
}

:deep(.tiptap h1:first-child),
:deep(.tiptap h2:first-child),
:deep(.tiptap h3:first-child) {
    margin-top: 0;
}

/* ── Blockquote ── */
:deep(.tiptap blockquote) {
    border-left: 3px solid var(--border);
    padding: 0.5rem 1rem;
    margin: 1rem 0;
    color: var(--muted-foreground);
}

/* ── Code ── */
:deep(.tiptap pre) {
    background: var(--muted);
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    margin: 1rem 0;
    overflow-x: auto;
    font-size: 0.875rem;
    line-height: 1.5;
}

:deep(.tiptap code) {
    background: var(--muted);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.9em;
}

:deep(.tiptap pre code) {
    background: none;
    padding: 0;
    font-size: inherit;
}

/* ── Lists ── */
:deep(.tiptap ul) {
    padding-left: 1.5rem;
    list-style-type: disc;
    margin: 0.75rem 0;
}

:deep(.tiptap ol) {
    padding-left: 1.5rem;
    list-style-type: decimal;
    margin: 0.75rem 0;
}

:deep(.tiptap li) {
    padding-left: 0.25rem;
    margin: 0.25rem 0;
}

/* ── Task lists ── */
:deep(.tiptap ul[data-type="taskList"]) {
    list-style: none;
    padding-left: 0;
    margin: 0.75rem 0;
}

:deep(.tiptap ul[data-type="taskList"] li) {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding-left: 0;
    margin: 0.25rem 0;
}

:deep(.tiptap ul[data-type="taskList"] li > label) {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding-top: 0.2rem;
}

:deep(.tiptap ul[data-type="taskList"] li > label input[type="checkbox"]) {
    width: 1rem;
    height: 1rem;
    margin: 0;
    cursor: pointer;
}

:deep(.tiptap ul[data-type="taskList"] li > div) {
    flex: 1;
    min-width: 0;
}

:deep(.tiptap ul[data-type="taskList"] li > div > p) {
    margin: 0;
}

/* ── Horizontal rule ── */
:deep(.tiptap hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 1.5rem 0;
}

/* ── Images ── */
:deep(.tiptap img) {
    max-width: 100%;
    border-radius: 0.375rem;
    margin: 0.5rem 0;
}

/* ── Tables ── */
:deep(.tiptap table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    table-layout: fixed;
}

:deep(.tiptap table td),
:deep(.tiptap table th) {
    border: 1px solid var(--border);
    padding: 0.5rem 0.75rem;
    min-width: 5rem;
    vertical-align: top;
    position: relative;
}

:deep(.tiptap table th) {
    background: var(--accent);
    font-weight: 600;
}

:deep(.tiptap table .selectedCell) {
    background: color-mix(in srgb, var(--foreground) 8%, transparent);
}

:deep(.tiptap table td > p),
:deep(.tiptap table th > p) {
    margin: 0;
}

:deep(.column-resize-handle) {
    position: absolute;
    right: -2px;
    top: 0;
    bottom: -2px;
    width: 4px;
    background: var(--primary);
    cursor: col-resize;
    z-index: 20;
}

:deep(.tableWrapper) {
    overflow: hidden;
    margin: 1rem 0;
}

:deep(.resize-cursor) {
    cursor: col-resize;
}

:deep([data-table-column-controls]),
:deep([data-table-row-controls]),
:deep(.table-column-controls),
:deep(.table-row-controls),
:deep(.tableWrapper > .controls),
:deep(.tableWrapper > button) {
    display: none !important;
}

:deep(.tiptap .is-empty::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--muted-foreground);
    pointer-events: none;
    height: 0;
}

/* ── Mentions ── */
:deep(.tiptap .mention) {
    background: var(--accent);
    color: var(--accent-foreground);
    border-radius: 0.25rem;
    padding: 0.125rem 0.375rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
}

/* ── Columns ── */
:deep(.column-content) {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 1rem;
}

:deep(.column) {
    min-width: 0;
    border: 1px solid transparent;
    border-radius: 0.375rem;
    padding: 0.5rem;
    transition: border-color 0.15s;
}

:deep(.column:hover) {
    border-color: var(--border);
}
</style>

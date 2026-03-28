<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import TableControls from "./notion/TableControls.vue";
import { StarterKit } from "@tiptap/starter-kit";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextAlign } from "@tiptap/extension-text-align";
import { SlashCommandExtension } from "./notion/SlashCommandExtension";
import "./notion/notion-dark-mode.css";

const THEME_KEY = "notion-editor-theme";
const theme = ref<"light" | "dark">(
    (localStorage.getItem(THEME_KEY) as "light" | "dark") ?? "light",
);

function toggleTheme() {
    theme.value = theme.value === "light" ? "dark" : "light";
    localStorage.setItem(THEME_KEY, theme.value);
}

const editor = useEditor({
    content: `<h2>Welcome to the Notion-like Editor</h2>
<p>This editor features slash commands, drag handles, and dark mode — inspired by Notion.</p>
<p>Try these:</p>
<ul>
  <li>Type <strong>/</strong> anywhere to open the command menu</li>
  <li>Filter commands by typing after the slash (e.g. <code>/head</code>)</li>
  <li>Use arrow keys and Enter to select a command</li>
  <li>Hover over any block to see the drag handle on the left</li>
  <li>Toggle dark mode with the button in the toolbar</li>
</ul>
<blockquote>This is a blockquote. Try inserting different block types below!</blockquote>
<p></p>`,
    extensions: [
        StarterKit,
        TaskList,
        TaskItem.configure({ nested: true }),
        Image.configure({ inline: true, allowBase64: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        TextAlign.configure({
            types: ["heading", "paragraph"],
        }),
        Placeholder.configure({
            placeholder: "Type / for commands...",
        }),
        SlashCommandExtension,
    ],
});

// Drag handle state
const dragHandleVisible = ref(false);
const dragHandleTop = ref(0);
const dragHandleBlock = ref<HTMLElement | null>(null);
const editorWrapRef = ref<HTMLElement | null>(null);
const editorBodyRef = ref<HTMLElement | null>(null);

// Drag-and-drop state
const isDragging = ref(false);
const dropIndicatorTop = ref(0);
const dropIndicatorVisible = ref(false);
let draggedNodePos = -1;

function getBlockAtY(y: number): HTMLElement | null {
    if (!editorBodyRef.value) return null;
    const editorEl = editorBodyRef.value.querySelector(
        ".tiptap",
    ) as HTMLElement;
    if (!editorEl) return null;

    const blocks = editorEl.querySelectorAll(":scope > *");
    for (const block of blocks) {
        const rect = (block as HTMLElement).getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
            return block as HTMLElement;
        }
    }
    return null;
}

function resolveBlockPos(
    blockEl: HTMLElement,
): { pos: number; nodeSize: number } | null {
    if (!editor.value) return null;
    const pos = editor.value.view.posAtDOM(blockEl, 0);
    const $pos = editor.value.state.doc.resolve(pos);
    const before = $pos.before($pos.depth);
    const node = editor.value.state.doc.nodeAt(before);
    if (!node) return null;
    return { pos: before, nodeSize: node.nodeSize };
}

function handleMouseMove(event: MouseEvent) {
    if (!editor.value || !editorBodyRef.value || isDragging.value) return;

    const found = getBlockAtY(event.clientY);

    if (found) {
        const bodyRect = editorBodyRef.value.getBoundingClientRect();
        const blockRect = found.getBoundingClientRect();

        // Vertically center the 24px handle on the block's first line of text.
        // For non-text blocks (images, hr, tables) the inherited line-height is
        // typically smaller than the handle, so Math.max clamps the offset to 0
        // and the handle stays top-aligned — which is the correct behaviour.
        const handleHeight = 24;
        const style = window.getComputedStyle(found);
        const lineHeight =
            parseFloat(style.lineHeight) ||
            parseFloat(style.fontSize) * 1.2;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const offset =
            paddingTop + Math.max(0, (lineHeight - handleHeight) / 2);

        dragHandleTop.value = blockRect.top - bodyRect.top + offset;
        dragHandleBlock.value = found;
        dragHandleVisible.value = true;
    } else {
        dragHandleVisible.value = false;
    }
}

function handleMouseLeave() {
    if (!isDragging.value) {
        dragHandleVisible.value = false;
    }
}

function handleGripDragStart(event: DragEvent) {
    if (!editor.value || !dragHandleBlock.value || !event.dataTransfer) return;

    const info = resolveBlockPos(dragHandleBlock.value);
    if (!info) return;

    draggedNodePos = info.pos;
    isDragging.value = true;

    // Required for Firefox
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "");

    // Use the block element as the drag image
    event.dataTransfer.setDragImage(dragHandleBlock.value, 0, 0);
}

function handleBodyDragOver(event: DragEvent) {
    if (!isDragging.value || !editorBodyRef.value) return;
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
    }

    // Show drop indicator
    const bodyRect = editorBodyRef.value.getBoundingClientRect();
    const editorEl = editorBodyRef.value.querySelector(
        ".tiptap",
    ) as HTMLElement;
    if (!editorEl) return;

    const blocks = editorEl.querySelectorAll(":scope > *");
    let closestTop = 0;
    let closestDist = Infinity;

    for (const block of blocks) {
        const rect = (block as HTMLElement).getBoundingClientRect();
        // Check distance to top edge of block
        const distTop = Math.abs(event.clientY - rect.top);
        if (distTop < closestDist) {
            closestDist = distTop;
            closestTop = rect.top - bodyRect.top;
        }
        // Check distance to bottom edge of block
        const distBottom = Math.abs(event.clientY - rect.bottom);
        if (distBottom < closestDist) {
            closestDist = distBottom;
            closestTop = rect.bottom - bodyRect.top;
        }
    }

    dropIndicatorTop.value = closestTop;
    dropIndicatorVisible.value = true;
}

function handleBodyDragLeave() {
    dropIndicatorVisible.value = false;
}

function handleBodyDrop(event: DragEvent) {
    event.preventDefault();
    dropIndicatorVisible.value = false;
    isDragging.value = false;
    dragHandleVisible.value = false;

    if (!editor.value || draggedNodePos < 0) return;

    const editorEl = editorBodyRef.value?.querySelector(
        ".tiptap",
    ) as HTMLElement;
    if (!editorEl) return;

    // Find the target position based on where we dropped
    const blocks = editorEl.querySelectorAll(":scope > *");
    let targetPos = -1;

    for (const block of blocks) {
        const rect = (block as HTMLElement).getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const info = resolveBlockPos(block as HTMLElement);
        if (!info) continue;

        if (event.clientY < midY) {
            // Drop before this block
            targetPos = info.pos;
            break;
        } else {
            // Drop after this block
            targetPos = info.pos + info.nodeSize;
        }
    }

    if (targetPos < 0) return;

    // Get the node to move
    const { state } = editor.value;
    const node = state.doc.nodeAt(draggedNodePos);
    if (!node) return;
    const nodeSize = node.nodeSize;

    // Skip if dropping at same position
    if (targetPos === draggedNodePos || targetPos === draggedNodePos + nodeSize)
        return;

    // Build transaction: delete from old pos, insert at new pos
    const { tr } = state;
    const nodeContent = node.toJSON();

    // If target is after the dragged node, adjust for the removal
    if (targetPos > draggedNodePos) {
        tr.delete(draggedNodePos, draggedNodePos + nodeSize);
        const adjustedTarget = targetPos - nodeSize;
        tr.insert(adjustedTarget, state.schema.nodeFromJSON(nodeContent));
    } else {
        tr.insert(targetPos, state.schema.nodeFromJSON(nodeContent));
        tr.delete(
            draggedNodePos + nodeSize,
            draggedNodePos + nodeSize + nodeSize,
        );
    }

    editor.value.view.dispatch(tr);
    draggedNodePos = -1;
}

function handleDragEnd() {
    isDragging.value = false;
    dropIndicatorVisible.value = false;
    draggedNodePos = -1;
}

function handlePlusClick() {
    if (!editor.value || !dragHandleBlock.value) return;
    const e = editor.value;
    const pos = e.view.posAtDOM(dragHandleBlock.value, 0);
    const $pos = e.state.doc.resolve(pos);
    const parentType = $pos.parent.type.name;

    // Container nodes (lists, blockquotes, etc.): insert a new paragraph AFTER the container
    const containers = ["blockquote", "bulletList", "orderedList", "taskList"];
    if (containers.includes(parentType)) {
        const before = $pos.before($pos.depth);
        const node = e.state.doc.nodeAt(before);
        if (!node) return;
        const afterContainer = before + node.nodeSize;
        e.chain()
            .focus()
            .insertContentAt(afterContainer, {
                type: "paragraph",
                content: [{ type: "text", text: "/" }],
            })
            .setTextSelection(afterContainer + 2)
            .run();
    } else {
        // Simple blocks (paragraph, heading, etc.): split and insert /
        const endPos = $pos.end();
        e.chain()
            .focus()
            .setTextSelection(endPos)
            .splitBlock()
            .insertContent("/")
            .run();
    }
}

onMounted(() => {
    // nothing
});

defineExpose({ editor });
</script>

<template>
    <div
        ref="editorWrapRef"
        class="notion-editor-wrap"
        :data-theme="theme"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
    >
        <div class="notion-toolbar">
            <button
                @click="editor?.chain().focus().toggleBold().run()"
                :class="{ active: editor?.isActive('bold') }"
            >
                Bold
            </button>
            <button
                @click="editor?.chain().focus().toggleItalic().run()"
                :class="{ active: editor?.isActive('italic') }"
            >
                Italic
            </button>
            <span class="separator" />
            <button
                @click="
                    editor?.chain().focus().toggleHeading({ level: 1 }).run()
                "
                :class="{ active: editor?.isActive('heading', { level: 1 }) }"
            >
                H1
            </button>
            <button
                @click="
                    editor?.chain().focus().toggleHeading({ level: 2 }).run()
                "
                :class="{ active: editor?.isActive('heading', { level: 2 }) }"
            >
                H2
            </button>
            <span class="separator" />
            <button
                @click="editor?.chain().focus().toggleBulletList().run()"
                :class="{ active: editor?.isActive('bulletList') }"
            >
                Bullet List
            </button>
            <button
                @click="editor?.chain().focus().toggleTaskList().run()"
                :class="{ active: editor?.isActive('taskList') }"
            >
                Task List
            </button>
            <span class="separator" />
            <button class="theme-toggle" @click="toggleTheme">
                {{ theme === "light" ? "\u263E Dark" : "\u2600 Light" }}
            </button>
        </div>

        <div
            ref="editorBodyRef"
            class="notion-editor-body"
            @dragover="handleBodyDragOver"
            @dragleave="handleBodyDragLeave"
            @drop="handleBodyDrop"
        >
            <!-- Drag handle -->
            <div
                v-show="dragHandleVisible"
                class="drag-handle"
                :style="{ top: dragHandleTop + 'px' }"
            >
                <button
                    class="drag-plus"
                    title="Click to insert block"
                    @click.stop="handlePlusClick"
                >
                    +
                </button>
                <div
                    class="drag-grip"
                    draggable="true"
                    title="Drag to move block"
                    @dragstart="handleGripDragStart"
                    @dragend="handleDragEnd"
                >
                    <span class="grip-dots"></span>
                </div>
            </div>

            <!-- Drop indicator line -->
            <div
                v-show="dropIndicatorVisible"
                class="drop-indicator"
                :style="{ top: dropIndicatorTop + 'px' }"
            />

            <editor-content :editor="editor" />

            <!-- Text formatting bubble menu -->
            <BubbleMenu
                v-if="editor"
                :editor="editor"
                :tippy-options="{ maxWidth: 'none' }"
            >
                <div class="format-bubble-menu">
                    <!-- Inline formatting -->
                    <button
                        @click="editor?.chain().focus().toggleBold().run()"
                        :class="{ active: editor?.isActive('bold') }"
                        title="Bold"
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        @click="editor?.chain().focus().toggleItalic().run()"
                        :class="{ active: editor?.isActive('italic') }"
                        title="Italic"
                    >
                        <em>I</em>
                    </button>
                    <button
                        @click="
                            editor?.chain().focus().toggleUnderline().run()
                        "
                        :class="{ active: editor?.isActive('underline') }"
                        title="Underline"
                    >
                        <span style="text-decoration: underline">U</span>
                    </button>
                    <button
                        @click="editor?.chain().focus().toggleStrike().run()"
                        :class="{ active: editor?.isActive('strike') }"
                        title="Strikethrough"
                    >
                        <span style="text-decoration: line-through">S</span>
                    </button>
                    <button
                        @click="editor?.chain().focus().toggleCode().run()"
                        :class="{ active: editor?.isActive('code') }"
                        title="Inline code"
                    >
                        &lt;/&gt;
                    </button>
                    <span class="bubble-sep" />

                    <!-- Text alignment -->
                    <button
                        @click="
                            editor
                                ?.chain()
                                .focus()
                                .setTextAlign('left')
                                .run()
                        "
                        :class="{
                            active: editor?.isActive({
                                textAlign: 'left',
                            }),
                        }"
                        title="Align left"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="3" x2="14" y2="3"/><line x1="2" y1="7" x2="10" y2="7"/><line x1="2" y1="11" x2="14" y2="11"/></svg>
                    </button>
                    <button
                        @click="
                            editor
                                ?.chain()
                                .focus()
                                .setTextAlign('center')
                                .run()
                        "
                        :class="{
                            active: editor?.isActive({
                                textAlign: 'center',
                            }),
                        }"
                        title="Align center"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="3" x2="14" y2="3"/><line x1="4" y1="7" x2="12" y2="7"/><line x1="2" y1="11" x2="14" y2="11"/></svg>
                    </button>
                    <button
                        @click="
                            editor
                                ?.chain()
                                .focus()
                                .setTextAlign('right')
                                .run()
                        "
                        :class="{
                            active: editor?.isActive({
                                textAlign: 'right',
                            }),
                        }"
                        title="Align right"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="3" x2="14" y2="3"/><line x1="6" y1="7" x2="14" y2="7"/><line x1="2" y1="11" x2="14" y2="11"/></svg>
                    </button>
                    <button
                        @click="
                            editor
                                ?.chain()
                                .focus()
                                .setTextAlign('justify')
                                .run()
                        "
                        :class="{
                            active: editor?.isActive({
                                textAlign: 'justify',
                            }),
                        }"
                        title="Justify"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="3" x2="14" y2="3"/><line x1="2" y1="7" x2="14" y2="7"/><line x1="2" y1="11" x2="14" y2="11"/></svg>
                    </button>
                </div>
            </BubbleMenu>

            <!-- Notion-style table controls -->
            <TableControls
                v-if="editor"
                :editor="editor"
                :container-el="editorBodyRef"
            />
        </div>
    </div>
</template>

<style scoped>
.notion-editor-wrap {
    background: var(--notion-bg);
    color: var(--notion-text);
    border-radius: 8px;
    border: 1px solid var(--notion-border);
    transition:
        background 0.2s,
        color 0.2s;
}

.notion-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--notion-border);
    background: var(--notion-toolbar-bg);
    border-radius: 8px 8px 0 0;
}

.notion-toolbar button {
    padding: 4px 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    background: none;
    color: var(--notion-text);
}

.notion-toolbar button:hover {
    background: var(--notion-hover);
}

.notion-toolbar button.active {
    background: var(--notion-hover);
    font-weight: 600;
}

.notion-toolbar .separator {
    width: 1px;
    background: var(--notion-border);
    margin: 2px 4px;
}

.theme-toggle {
    margin-left: auto;
}

.notion-editor-body {
    position: relative;
    max-width: 900px;
    margin: 0 auto;
    padding-left: 56px;
    padding-right: 16px;
}

:deep(.tiptap) {
    padding: 16px 16px 16px 0;
    min-height: 300px;
    outline: none;
}

:deep(.tiptap p) {
    margin: 0.25em 0;
}

:deep(.tiptap h1) {
    margin-top: 1.2em;
}

:deep(.tiptap h2) {
    margin-top: 1em;
}

:deep(.tiptap h3) {
    margin-top: 0.8em;
}

:deep(.tiptap blockquote) {
    border-left: 3px solid var(--notion-border);
    padding-left: 14px;
    color: var(--notion-text-secondary);
}

:deep(.tiptap pre) {
    background: var(--notion-code-bg);
    padding: 12px 16px;
    border-radius: 4px;
    overflow-x: auto;
}

:deep(.tiptap code) {
    background: var(--notion-code-bg);
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 0.9em;
}

:deep(.tiptap pre code) {
    background: none;
    padding: 0;
}

/* List alignment — keep bullets/numbers inside the content area */
:deep(.tiptap ul),
:deep(.tiptap ol) {
    padding-left: 24px;
}

:deep(.tiptap ul[data-type="taskList"]) {
    list-style: none;
    padding-left: 0;
}

:deep(.tiptap ul[data-type="taskList"] li) {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 1.6em;
}

:deep(.tiptap ul[data-type="taskList"] li > label) {
    flex-shrink: 0;
    display: flex;
    align-items: center;
}

:deep(.tiptap ul[data-type="taskList"] li > label input[type="checkbox"]) {
    width: 16px;
    height: 16px;
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

:deep(.tiptap hr) {
    border: none;
    border-top: 1px solid var(--notion-border);
    margin: 1em 0;
}

:deep(.tiptap img) {
    max-width: 100%;
    border-radius: 4px;
}

:deep(.tiptap table) {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5em 0;
    overflow: visible;
    table-layout: fixed;
}

:deep(.tiptap table td),
:deep(.tiptap table th) {
    border: 1px solid var(--notion-border);
    padding: 6px 10px;
    min-width: 80px;
    vertical-align: top;
    position: relative;
}

:deep(.tiptap table th) {
    background: var(--notion-hover);
    font-weight: 600;
}

:deep(.tiptap table .selectedCell) {
    background: color-mix(in srgb, var(--notion-text) 8%, transparent);
}

/* Column resize handle */
:deep(.column-resize-handle) {
    position: absolute;
    right: -2px;
    top: 0;
    bottom: -2px;
    width: 4px;
    background: #6c63ff;
    cursor: col-resize;
    z-index: 20;
}

:deep(.tableWrapper) {
    overflow-x: auto;
    margin: 0.5em 0;
}

:deep(.resize-cursor) {
    cursor: col-resize;
}

/* Hide built-in tiptap table controls */
:deep([data-table-column-controls]),
:deep([data-table-row-controls]),
:deep(.table-column-controls),
:deep(.table-row-controls),
:deep(.tableWrapper > .controls),
:deep(.tableWrapper > button) {
    display: none !important;
}

:deep(.tiptap p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--notion-text-secondary);
    pointer-events: none;
    height: 0;
}

/* Drag handle */
.drag-handle {
    position: absolute;
    left: 8px;
    display: flex;
    align-items: center;
    gap: 0;
    z-index: 10;
    transition: top 0.1s ease;
    opacity: 0;
}

.drag-handle:hover,
.notion-editor-body:hover .drag-handle[style] {
    opacity: 1;
}

/* Show handle when parent detects it should be visible (v-show handles this) */
.drag-handle[style*="top"] {
    opacity: 1;
}

.drag-plus {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: none;
    color: var(--notion-drag-handle);
    cursor: pointer;
    border-radius: 4px;
    font-size: 18px;
    font-weight: 300;
    line-height: 1;
    padding: 0;
}

.drag-plus:hover {
    background: var(--notion-hover);
    color: var(--notion-text);
}

.drag-grip {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 24px;
    border: none;
    background: none;
    color: var(--notion-drag-handle);
    cursor: grab;
    border-radius: 4px;
    padding: 0;
}

.drag-grip:hover {
    background: var(--notion-hover);
    color: var(--notion-text);
}

.drag-grip:active {
    cursor: grabbing;
}

.grip-dots {
    display: grid;
    grid-template-columns: 3px 3px;
    grid-template-rows: 3px 3px 3px;
    gap: 2px;
}

.grip-dots::before,
.grip-dots::after {
    content: "";
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: currentColor;
    box-shadow:
        0 5px 0 currentColor,
        0 10px 0 currentColor;
}

/* Bubble menu — wrapper z-index must beat table-controls (z-index: 15) */
:deep([tippy-options]) {
    z-index: 50 !important;
}

.format-bubble-menu {
    display: flex;
    align-items: center;
    gap: 2px;
    background: var(--notion-bg, #fff);
    border: 1px solid var(--notion-border, #e0e0e0);
    border-radius: 8px;
    padding: 4px 6px;
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.05),
        0 4px 16px rgba(0, 0, 0, 0.2);
}

.format-bubble-menu button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    background: none;
    color: var(--notion-text, #333);
}

.format-bubble-menu button:hover {
    background: var(--notion-hover, #f0f0f0);
}

.format-bubble-menu button.active {
    background: var(--notion-hover, #f0f0f0);
    color: #6c63ff;
}

.bubble-sep {
    width: 1px;
    height: 20px;
    background: var(--notion-border, #e0e0e0);
    margin: 0 2px;
    flex-shrink: 0;
}

/* Drop indicator */
.drop-indicator {
    position: absolute;
    left: 56px;
    right: 0;
    height: 2px;
    background: #2383e2;
    border-radius: 1px;
    z-index: 20;
    pointer-events: none;
}
</style>

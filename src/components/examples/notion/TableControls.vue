<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from "vue";
import type { Editor } from "@tiptap/core";

const props = defineProps<{
    editor: Editor;
    containerEl: HTMLElement | null;
}>();

const visible = ref(false);
const rowHandles = ref<Array<{ top: number; height: number }>>([]);
const colHandles = ref<Array<{ left: number; width: number }>>([]);
const tbl = ref({ top: 0, left: 0, width: 0, height: 0 });

// Track which row/col is hovered (-1 = none)
const hoveredRow = ref(-1);
const hoveredCol = ref(-1);

const menu = ref<{
    type: "row" | "col";
    index: number;
    top: number;
    left: number;
} | null>(null);

let tableEl: HTMLElement | null = null;

function findTable() {
    const { $from } = props.editor.state.selection;
    for (let d = $from.depth; d > 0; d--) {
        if ($from.node(d).type.name === "table") {
            return {
                pos: $from.before(d),
                node: $from.node(d),
                depth: d,
            };
        }
    }
    return null;
}

function focusCell(rowIndex: number, colIndex: number) {
    const table = findTable();
    if (!table) return;

    let pos = table.pos + 1;
    for (let r = 0; r < table.node.childCount; r++) {
        const row = table.node.child(r);
        if (r === rowIndex) {
            let cPos = pos + 1;
            for (let c = 0; c < row.childCount; c++) {
                if (c === colIndex) {
                    props.editor
                        .chain()
                        .focus()
                        .setTextSelection(cPos + 1)
                        .run();
                    return;
                }
                cPos += row.child(c).nodeSize;
            }
            props.editor
                .chain()
                .focus()
                .setTextSelection(pos + 2)
                .run();
            return;
        }
        pos += row.nodeSize;
    }
}

function update() {
    if (!props.containerEl) {
        visible.value = false;
        return;
    }

    const table = findTable();
    if (!table) {
        visible.value = false;
        menu.value = null;
        return;
    }

    const dom = props.editor.view.nodeDOM(table.pos) as HTMLElement | null;
    if (!dom) {
        visible.value = false;
        return;
    }

    const el =
        dom.tagName === "TABLE" ? dom : dom.querySelector("table");
    if (!el) {
        visible.value = false;
        return;
    }

    tableEl = el as HTMLElement;
    visible.value = true;
    const cr = props.containerEl.getBoundingClientRect();
    const tr = el.getBoundingClientRect();

    tbl.value = {
        top: tr.top - cr.top,
        left: tr.left - cr.left,
        width: tr.width,
        height: tr.height,
    };

    const trs = el.querySelectorAll("tr");
    rowHandles.value = Array.from(trs).map((row) => {
        const r = row.getBoundingClientRect();
        return { top: r.top - cr.top, height: r.height };
    });

    if (trs.length > 0 && trs[0]) {
        const cells = trs[0].querySelectorAll("th, td");
        colHandles.value = Array.from(cells).map((cell) => {
            const r = cell.getBoundingClientRect();
            return { left: r.left - cr.left, width: r.width };
        });
    }
}

// Mouse tracking: determine which row/col the cursor is over
function onMouseMove(e: MouseEvent) {
    if (!tableEl || !visible.value) {
        hoveredRow.value = -1;
        hoveredCol.value = -1;
        return;
    }

    const tRect = tableEl.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    // Expand hit area: include the handle zone to the left and above the table
    const handleZone = 24;
    const inTableArea =
        x >= tRect.left - handleZone &&
        x <= tRect.right + handleZone &&
        y >= tRect.top - handleZone &&
        y <= tRect.bottom + handleZone;

    if (!inTableArea) {
        hoveredRow.value = -1;
        hoveredCol.value = -1;
        return;
    }

    // Find which row the mouse is over
    const trs = tableEl.querySelectorAll("tr");
    let foundRow = -1;
    for (let i = 0; i < trs.length; i++) {
        const r = trs[i]!.getBoundingClientRect();
        if (y >= r.top && y <= r.bottom) {
            foundRow = i;
            break;
        }
    }
    // If mouse is below the table (in the + button zone), keep last row active
    if (foundRow === -1 && y > tRect.bottom && y <= tRect.bottom + handleZone) {
        foundRow = trs.length - 1;
    }
    hoveredRow.value = foundRow;

    // Find which column the mouse is over
    if (trs.length > 0 && trs[0]) {
        const cells = trs[0].querySelectorAll("th, td");
        let foundCol = -1;
        for (let i = 0; i < cells.length; i++) {
            const r = cells[i]!.getBoundingClientRect();
            if (x >= r.left && x <= r.right) {
                foundCol = i;
                break;
            }
        }
        // If mouse is to the right of the table (in the + button zone), keep last col active
        if (foundCol === -1 && x > tRect.right && x <= tRect.right + handleZone) {
            foundCol = cells.length - 1;
        }
        hoveredCol.value = foundCol;
    }
}

function openRowMenu(index: number, e: MouseEvent) {
    focusCell(index, 0);
    const cr = props.containerEl!.getBoundingClientRect();
    const br = (e.currentTarget as HTMLElement).getBoundingClientRect();
    menu.value = {
        type: "row",
        index,
        top: br.bottom - cr.top + 4,
        left: br.left - cr.left,
    };
}

function openColMenu(index: number, e: MouseEvent) {
    focusCell(0, index);
    const cr = props.containerEl!.getBoundingClientRect();
    const br = (e.currentTarget as HTMLElement).getBoundingClientRect();
    menu.value = {
        type: "col",
        index,
        top: br.bottom - cr.top + 4,
        left: br.left - cr.left,
    };
}

function run(fn: () => void) {
    fn();
    menu.value = null;
    nextTick(update);
}

function addRowAtEnd() {
    const table = findTable();
    if (!table) return;
    focusCell(table.node.childCount - 1, 0);
    nextTick(() => {
        props.editor.chain().focus().addRowAfter().run();
        nextTick(update);
    });
}

function addColAtEnd() {
    const table = findTable();
    if (!table || table.node.childCount === 0) return;
    const lastColIdx = table.node.child(0).childCount - 1;
    focusCell(0, lastColIdx);
    nextTick(() => {
        props.editor.chain().focus().addColumnAfter().run();
        nextTick(update);
    });
}

function onDocClick(e: MouseEvent) {
    if (menu.value) {
        const t = e.target as HTMLElement;
        if (!t.closest(".tc-menu") && !t.closest(".tc-handle")) {
            menu.value = null;
        }
    }
}

let unwatch: (() => void) | null = null;

onMounted(() => {
    const handler = () => nextTick(update);
    props.editor.on("transaction", handler);
    unwatch = () => props.editor.off("transaction", handler);
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("mousemove", onMouseMove);
    update();
});

onBeforeUnmount(() => {
    unwatch?.();
    document.removeEventListener("click", onDocClick, true);
    document.removeEventListener("mousemove", onMouseMove);
});
</script>

<template>
    <div v-show="visible" class="table-controls">
        <!-- Column handles (top) — only show hovered one -->
        <button
            v-for="(col, i) in colHandles"
            :key="'c' + i"
            class="tc-handle tc-col"
            :class="{ 'tc-visible': hoveredCol === i || (menu?.type === 'col' && menu.index === i) }"
            :style="{
                left: col.left + 'px',
                width: col.width + 'px',
                top: tbl.top - 20 + 'px',
            }"
            @click.stop="openColMenu(i, $event)"
        >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <circle cx="3" cy="6" r="1.2" />
                <circle cx="6" cy="6" r="1.2" />
                <circle cx="9" cy="6" r="1.2" />
            </svg>
        </button>

        <!-- Row handles (left) — only show hovered one -->
        <button
            v-for="(row, i) in rowHandles"
            :key="'r' + i"
            class="tc-handle tc-row"
            :class="{ 'tc-visible': hoveredRow === i || (menu?.type === 'row' && menu.index === i) }"
            :style="{
                top: row.top + 'px',
                height: row.height + 'px',
                left: tbl.left - 20 + 'px',
            }"
            @click.stop="openRowMenu(i, $event)"
        >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <circle cx="6" cy="3" r="1.2" />
                <circle cx="6" cy="6" r="1.2" />
                <circle cx="6" cy="9" r="1.2" />
            </svg>
        </button>

        <!-- Add column button (right) — show when hovering last column -->
        <button
            class="tc-add tc-add-col"
            :class="{ 'tc-visible': hoveredCol === colHandles.length - 1 }"
            :style="{
                left: tbl.left + tbl.width + 2 + 'px',
                top: tbl.top + 'px',
                height: tbl.height + 'px',
            }"
            @click="addColAtEnd"
            title="Add column"
        >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="7" y1="3" x2="7" y2="11" />
                <line x1="3" y1="7" x2="11" y2="7" />
            </svg>
        </button>

        <!-- Add row button (bottom) — show when hovering last row -->
        <button
            class="tc-add tc-add-row"
            :class="{ 'tc-visible': hoveredRow === rowHandles.length - 1 }"
            :style="{
                top: tbl.top + tbl.height + 2 + 'px',
                left: tbl.left + 'px',
                width: tbl.width + 'px',
            }"
            @click="addRowAtEnd"
            title="Add row"
        >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="7" y1="3" x2="7" y2="11" />
                <line x1="3" y1="7" x2="11" y2="7" />
            </svg>
        </button>

        <!-- Context menu -->
        <div
            v-if="menu"
            class="tc-menu"
            :style="{ top: menu.top + 'px', left: menu.left + 'px' }"
            @click.stop
        >
            <template v-if="menu.type === 'row'">
                <button
                    @click="
                        run(() =>
                            editor.chain().focus().addRowBefore().run(),
                        )
                    "
                >
                    <svg class="tc-mi" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="4" y1="5" x2="8" y2="1" /><line x1="8" y1="1" x2="12" y2="5" /><line x1="8" y1="1" x2="8" y2="12" /></svg>
                    Insert row above
                </button>
                <button
                    @click="
                        run(() =>
                            editor.chain().focus().addRowAfter().run(),
                        )
                    "
                >
                    <svg class="tc-mi" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="4" y1="11" x2="8" y2="15" /><line x1="8" y1="15" x2="12" y2="11" /><line x1="8" y1="4" x2="8" y2="15" /></svg>
                    Insert row below
                </button>
                <div class="tc-sep" />
                <button
                    class="danger"
                    @click="
                        run(() =>
                            editor.chain().focus().deleteRow().run(),
                        )
                    "
                >
                    <svg class="tc-mi" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="4" x2="14" y2="4" /><path d="M5.5 4V2.5h5V4" /><path d="M3.5 4v9.5a1 1 0 001 1h7a1 1 0 001-1V4" /><line x1="6.5" y1="7" x2="6.5" y2="12" /><line x1="9.5" y1="7" x2="9.5" y2="12" /></svg>
                    Delete row
                </button>
            </template>
            <template v-else>
                <button
                    @click="
                        run(() =>
                            editor
                                .chain()
                                .focus()
                                .addColumnBefore()
                                .run(),
                        )
                    "
                >
                    <svg class="tc-mi" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="5" y1="4" x2="1" y2="8" /><line x1="1" y1="8" x2="5" y2="12" /><line x1="1" y1="8" x2="12" y2="8" /></svg>
                    Insert column before
                </button>
                <button
                    @click="
                        run(() =>
                            editor
                                .chain()
                                .focus()
                                .addColumnAfter()
                                .run(),
                        )
                    "
                >
                    <svg class="tc-mi" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="11" y1="4" x2="15" y2="8" /><line x1="15" y1="8" x2="11" y2="12" /><line x1="4" y1="8" x2="15" y2="8" /></svg>
                    Insert column after
                </button>
                <div class="tc-sep" />
                <button
                    class="danger"
                    @click="
                        run(() =>
                            editor
                                .chain()
                                .focus()
                                .deleteColumn()
                                .run(),
                        )
                    "
                >
                    <svg class="tc-mi" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="4" x2="14" y2="4" /><path d="M5.5 4V2.5h5V4" /><path d="M3.5 4v9.5a1 1 0 001 1h7a1 1 0 001-1V4" /><line x1="6.5" y1="7" x2="6.5" y2="12" /><line x1="9.5" y1="7" x2="9.5" y2="12" /></svg>
                    Delete column
                </button>
            </template>
            <div class="tc-sep" />
            <button
                class="danger"
                @click="
                    run(() =>
                        editor.chain().focus().deleteTable().run(),
                    )
                "
            >
                <svg class="tc-mi" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="4" x2="14" y2="4" /><path d="M5.5 4V2.5h5V4" /><path d="M3.5 4v9.5a1 1 0 001 1h7a1 1 0 001-1V4" /><line x1="6.5" y1="7" x2="6.5" y2="12" /><line x1="9.5" y1="7" x2="9.5" y2="12" /></svg>
                Delete table
            </button>
        </div>
    </div>
</template>

<style scoped>
.table-controls {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 15;
}

.table-controls > * {
    pointer-events: auto;
}

/* Handle buttons — hidden by default, shown via .tc-visible class */
.tc-handle {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: var(--notion-hover, rgba(255, 255, 255, 0.06));
    color: var(--notion-text-secondary, #999);
    cursor: pointer;
    border-radius: 4px;
    padding: 0;
    opacity: 0;
    pointer-events: none;
    transition:
        opacity 0.12s,
        background 0.12s;
}

.tc-handle.tc-visible {
    opacity: 0.7;
    pointer-events: auto;
}

.tc-handle.tc-visible:hover {
    opacity: 1;
    background: var(--notion-border, rgba(255, 255, 255, 0.12));
    color: var(--notion-text, #fff);
}

.tc-col {
    height: 18px;
}

.tc-row {
    width: 18px;
}

/* Add buttons — hidden by default */
.tc-add {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: var(--notion-hover, rgba(255, 255, 255, 0.06));
    color: var(--notion-text-secondary, #999);
    cursor: pointer;
    border-radius: 4px;
    opacity: 0;
    pointer-events: none;
    transition:
        opacity 0.12s,
        background 0.12s;
}

.tc-add.tc-visible {
    opacity: 0.5;
    pointer-events: auto;
}

.tc-add.tc-visible:hover {
    opacity: 1;
    background: var(--notion-border, rgba(255, 255, 255, 0.12));
    color: var(--notion-text, #fff);
}

.tc-add-col {
    width: 20px;
}

.tc-add-row {
    height: 20px;
}

/* Context menu */
.tc-menu {
    position: absolute;
    min-width: 200px;
    background: var(--notion-bg, #fff);
    border: 1px solid var(--notion-border, #e0e0e0);
    border-radius: 8px;
    padding: 4px 0;
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.05),
        0 4px 16px rgba(0, 0, 0, 0.25);
    z-index: 100;
    pointer-events: auto;
}

.tc-menu button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 14px;
    border: none;
    background: none;
    color: var(--notion-text, #333);
    cursor: pointer;
    font-size: 13px;
    text-align: left;
    line-height: 1.4;
}

.tc-menu button:hover {
    background: var(--notion-hover, #f0f0f0);
}

.tc-menu button.danger {
    color: #e03e3e;
}

.tc-menu button.danger:hover {
    background: rgba(224, 62, 62, 0.08);
}

.tc-mi {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.tc-menu button.danger .tc-mi {
    stroke: #e03e3e;
}

.tc-sep {
    height: 1px;
    background: var(--notion-border, #e0e0e0);
    margin: 4px 0;
}
</style>

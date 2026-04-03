<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import type {
    MentionItem,
    CustomComponentRegistration,
} from "@/components/editor";
import { MeldEditor, useThemeMode } from "@/components/editor";
import { Button } from "@meldui/vue";
import { IconSun, IconMoon, IconListCheck } from "@meldui/tabler-vue";
import PollNodeView from "@/components/custom/poll/PollNodeView.vue";
import { usePollStore } from "@/components/custom/poll/usePollStore";

const { mode, applyTheme, removeTheme } = useThemeMode();

onMounted(() => applyTheme(mode.value));
onUnmounted(() => removeTheme());

function toggleTheme() {
    applyTheme(mode.value === "dark" ? "light" : "dark");
}

const content = ref(`<h2>Welcome to MeldEditor</h2>
<p>A pluggable, Notion-like rich-text editor built with tiptap and MeldUI.</p>
<p>Try these:</p>
<ul>
  <li>Type <strong>/</strong> anywhere to open the command menu</li>
  <li>Select text to see the bubble menu</li>
  <li>Hover over any block to see the drag handle on the left</li>
</ul>
<blockquote>This is a blockquote. Try inserting different block types!</blockquote>
<img src="https://picsum.photos/id/28/800/400" alt="Sample landscape" />`);

// Demo mention search — simulates async API call
const demoUsers: MentionItem[] = [
    { id: "user-1", label: "Alice Johnson" },
    { id: "user-2", label: "Bob Smith" },
    { id: "user-3", label: "Carol White" },
    { id: "user-4", label: "David Brown" },
    { id: "user-5", label: "Eve Davis" },
];

const pollStore = usePollStore();

const customComponents: CustomComponentRegistration[] = [
    {
        name: "interactivePoll",
        component: PollNodeView,
        atom: true,
        draggable: true,
        group: "block",
        attrs: {
            entityId: { default: null },
        },
        slashCommand: {
            title: "Poll",
            description: "Insert an interactive poll",
            icon: IconListCheck,
            keywords: ["poll", "survey", "vote", "question"],
        },
        confirmDelete: true,
        onDelete: (attrs) => {
            console.log("==================", attrs.entityId);
            if (attrs.entityId) {
                pollStore.deletePoll(attrs.entityId as string);
            }
        },
    },
];

async function searchMentions(query: string): Promise<MentionItem[]> {
    await new Promise((r) => setTimeout(r, 300)); // simulate latency
    if (!query) return demoUsers;
    const q = query.toLowerCase();
    return demoUsers.filter((u) => u.label.toLowerCase().includes(q));
}
</script>

<template>
    <div class="min-h-screen bg-background p-8 transition-colors">
        <div class="mx-auto max-w-5xl">
            <div class="mb-4 flex items-center justify-between">
                <h1 class="text-xl font-semibold text-foreground">
                    MeldEditor Demo
                </h1>
                <Button variant="ghost" size="icon" @click="toggleTheme">
                    <IconSun v-if="mode === 'dark'" :size="18" />
                    <IconMoon v-else :size="18" />
                </Button>
            </div>
            <MeldEditor
                v-model="content"
                :on-mention-search="searchMentions"
                :custom-components="customComponents"
            />
        </div>
    </div>
</template>

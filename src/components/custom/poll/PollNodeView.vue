<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { Button, Input, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@meldui/vue'
import { IconSettings, IconTrash, IconPlus, IconX, IconCheck, IconCircle, IconEye, IconEyeOff } from '@meldui/tabler-vue'
import { usePollStore } from './usePollStore'
import PollSetupDialog from './PollSetupDialog.vue'

const props = defineProps<{
  node: any
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  selected: boolean
  editor: any
  getPos: () => number
  extension: any
}>()

const store = usePollStore()

// --- Local UI state ---
const showResults = ref(false)
const settingsOpen = ref(false)
const editingQuestion = ref(false)
const questionDraft = ref('')
const editingOptionId = ref<string | null>(null)
const optionDraft = ref('')
const containerRef = ref<HTMLElement | null>(null)
const setupOpen = ref(false)

// --- Computed from node attrs + store ---
const entityId = computed(() => props.node.attrs.entityId as string | null)
const poll = computed(() => entityId.value ? store.getPoll(entityId.value) : undefined)
const isConfigured = computed(() => entityId.value !== null)

const totalVotes = computed(() =>
  poll.value ? poll.value.options.reduce((sum, o) => sum + o.votes, 0) : 0,
)

function getPercentage(votes: number): number {
  return totalVotes.value === 0 ? 0 : Math.round((votes / totalVotes.value) * 100)
}

function isVoted(optionId: string): boolean {
  return poll.value ? poll.value.voted.includes(optionId) : false
}

// --- Lifecycle ---
onMounted(() => {
  if (!isConfigured.value) {
    setupOpen.value = true
  }
  document.addEventListener('mousedown', onDocumentMousedown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentMousedown)
})

function onDocumentMousedown(event: MouseEvent) {
  if (!props.selected) return
  if (containerRef.value?.contains(event.target as HTMLElement)) return
  settingsOpen.value = false
}

// --- Setup dialog handlers ---
function onSetupCreate(data: { question: string; options: string[]; multiSelect: boolean }) {
  const id = store.createPoll({
    question: data.question,
    options: data.options.map(text => ({
      id: crypto.randomUUID(),
      text,
      votes: 0,
    })),
    multiSelect: data.multiSelect,
    voted: [],
  })
  props.updateAttributes({ entityId: id })
  setupOpen.value = false
}

function onSetupClose(open: boolean) {
  setupOpen.value = open
  if (!open && !isConfigured.value) {
    props.deleteNode()
  }
}

// --- Voting ---
function vote(optionId: string) {
  if (!poll.value || !entityId.value) return
  const options = poll.value.options.map(o => ({ ...o }))
  let voted = [...poll.value.voted]

  if (poll.value.multiSelect) {
    const idx = voted.indexOf(optionId)
    if (idx >= 0) {
      voted.splice(idx, 1)
      const opt = options.find(o => o.id === optionId)
      if (opt) opt.votes--
    } else {
      voted.push(optionId)
      const opt = options.find(o => o.id === optionId)
      if (opt) opt.votes++
    }
  } else {
    if (voted.length > 0 && voted[0] !== optionId) {
      const prev = options.find(o => o.id === voted[0])
      if (prev) prev.votes--
    }
    if (voted[0] === optionId) {
      const opt = options.find(o => o.id === optionId)
      if (opt) opt.votes--
      voted = []
    } else {
      const opt = options.find(o => o.id === optionId)
      if (opt) opt.votes++
      voted = [optionId]
    }
  }

  store.updatePoll(entityId.value, { options, voted })
}

// --- Option management ---
function addOption() {
  if (!poll.value || !entityId.value) return
  const options = [...poll.value.options, {
    id: crypto.randomUUID(),
    text: `Option ${poll.value.options.length + 1}`,
    votes: 0,
  }]
  store.updatePoll(entityId.value, { options })
}

function removeOption(optionId: string) {
  if (!poll.value || !entityId.value) return
  if (poll.value.options.length <= 2) return
  const options = poll.value.options.filter(o => o.id !== optionId)
  const voted = poll.value.voted.filter(id => id !== optionId)
  store.updatePoll(entityId.value, { options, voted })
}

// --- Inline editing: question ---
function startEditQuestion() {
  if (!poll.value) return
  questionDraft.value = poll.value.question
  editingQuestion.value = true
}

function commitQuestion() {
  if (!entityId.value || !questionDraft.value.trim()) {
    editingQuestion.value = false
    return
  }
  store.updatePoll(entityId.value, { question: questionDraft.value.trim() })
  editingQuestion.value = false
}

// --- Inline editing: option text (in settings) ---
function startEditOption(optionId: string, currentText: string) {
  editingOptionId.value = optionId
  optionDraft.value = currentText
}

function commitOptionEdit(optionId: string) {
  if (!poll.value || !entityId.value || !optionDraft.value.trim()) {
    editingOptionId.value = null
    return
  }
  const options = poll.value.options.map(o =>
    o.id === optionId ? { ...o, text: optionDraft.value.trim() } : { ...o },
  )
  store.updatePoll(entityId.value, { options })
  editingOptionId.value = null
}

// --- Toggle multi-select ---
function toggleMultiSelect() {
  if (!poll.value || !entityId.value) return
  const newMulti = !poll.value.multiSelect
  if (!newMulti && poll.value.voted.length > 1) {
    store.updatePoll(entityId.value, { multiSelect: newMulti, voted: [poll.value.voted[0]!] })
  } else {
    store.updatePoll(entityId.value, { multiSelect: newMulti })
  }
}

// --- Delete ---
// Just call deleteNode(). The factory wrapper handles confirmation if confirmDelete is true.
// Store cleanup happens on unmount — when the node is actually removed from the editor.
function deletePoll() {
  props.deleteNode()
}
</script>

<template>
  <div ref="containerRef" class="relative my-2">
    <!-- State A: Unconfigured — setup dialog -->
    <template v-if="!isConfigured">
      <div class="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-8 text-muted-foreground">
        Setting up poll...
      </div>
      <PollSetupDialog
        :open="setupOpen"
        @update:open="onSetupClose"
        @create="onSetupCreate"
      />
    </template>

    <!-- State B: Entity not found -->
    <template v-else-if="!poll">
      <div class="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/30 p-6">
        <span class="text-sm text-muted-foreground">Poll not found — the data may have been cleared.</span>
        <Button variant="ghost" size="sm" class="text-destructive" @click="deletePoll">
          <IconTrash :size="14" class="mr-1" /> Remove
        </Button>
      </div>
    </template>

    <!-- State C: Active poll -->
    <template v-else>
      <!-- Bubble controls -->
      <div
        v-if="selected"
        class="absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg"
      >
        <TooltipProvider :delay-duration="400">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" @click.stop="settingsOpen = !settingsOpen">
                <IconSettings :size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" :side-offset="8">Settings</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon-sm"
                class="text-destructive hover:bg-destructive/10"
                @click.stop="deletePoll"
              >
                <IconTrash :size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" :side-offset="8">Delete poll</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <!-- Poll card -->
      <div class="rounded-lg border border-border bg-card p-4">
        <!-- Question -->
        <div class="mb-3" @mousedown.stop>
          <template v-if="editingQuestion">
            <Input
              v-model="questionDraft"
              class="text-lg font-semibold"
              autofocus
              @blur="commitQuestion"
              @keydown.enter="commitQuestion"
              @keydown.escape="editingQuestion = false"
            />
          </template>
          <template v-else>
            <h3
              class="text-lg font-semibold text-foreground cursor-text hover:text-primary/80 transition-colors"
              @click="startEditQuestion"
            >
              {{ poll.question }}
            </h3>
          </template>
        </div>

        <!-- Options: voting mode -->
        <div v-if="!showResults" class="space-y-2">
          <button
            v-for="option in poll.options"
            :key="option.id"
            class="flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors"
            :class="isVoted(option.id)
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40 hover:bg-accent/50'"
            @click.stop="vote(option.id)"
          >
            <span class="shrink-0">
              <IconCheck
                v-if="isVoted(option.id)"
                :size="18"
                class="text-primary"
              />
              <IconCircle v-else :size="18" class="text-muted-foreground" />
            </span>
            <span class="text-sm text-foreground">{{ option.text }}</span>
          </button>
        </div>

        <!-- Options: results mode -->
        <div v-else class="space-y-3">
          <div v-for="option in poll.options" :key="option.id">
            <div class="flex items-center justify-between mb-1">
              <span
                class="text-sm"
                :class="isVoted(option.id) ? 'font-semibold text-primary' : 'text-foreground'"
              >
                {{ option.text }}
              </span>
              <span class="text-xs text-muted-foreground">
                {{ getPercentage(option.votes) }}% ({{ option.votes }})
              </span>
            </div>
            <div class="h-2 rounded-full bg-muted overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="isVoted(option.id) ? 'bg-primary' : 'bg-primary/50'"
                :style="{ width: `${getPercentage(option.votes)}%` }"
              />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <Button variant="outline" size="sm" @click.stop="addOption" @mousedown.stop>
            <IconPlus :size="14" class="mr-1" />
            Add option
          </Button>
          <Button variant="ghost" size="sm" @click.stop="showResults = !showResults" @mousedown.stop>
            <IconEyeOff v-if="showResults" :size="14" class="mr-1" />
            <IconEye v-else :size="14" class="mr-1" />
            {{ showResults ? 'Show Votes' : 'Show Results' }}
          </Button>
        </div>

        <!-- Settings panel -->
        <div v-if="settingsOpen" class="border-t border-border pt-3 mt-3 space-y-3" @mousedown.stop>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="poll.multiSelect"
              class="rounded border-border"
              @change="toggleMultiSelect"
            />
            <span class="text-sm text-foreground">Allow multiple selections</span>
          </label>

          <div class="space-y-2">
            <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Options</label>
            <div
              v-for="option in poll.options"
              :key="option.id"
              class="flex items-center gap-2"
            >
              <template v-if="editingOptionId === option.id">
                <Input
                  v-model="optionDraft"
                  class="flex-1 text-sm"
                  autofocus
                  @blur="commitOptionEdit(option.id)"
                  @keydown.enter="commitOptionEdit(option.id)"
                  @keydown.escape="editingOptionId = null"
                />
              </template>
              <template v-else>
                <span
                  class="flex-1 text-sm text-foreground cursor-text rounded px-2 py-1 hover:bg-accent/50 transition-colors"
                  @click="startEditOption(option.id, option.text)"
                >
                  {{ option.text }}
                </span>
              </template>
              <Button
                v-if="poll.options.length > 2"
                variant="ghost"
                size="icon-sm"
                class="text-muted-foreground hover:text-destructive shrink-0"
                @click.stop="removeOption(option.id)"
              >
                <IconX :size="14" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

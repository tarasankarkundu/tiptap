import type { MentionItem, CustomComponentRegistration } from '@/components/editor'
import { IconListCheck } from '@meldui/tabler-vue'
import PollNodeView from '@/components/custom/poll/PollNodeView.vue'
import { usePollStore } from '@/components/custom/poll/usePollStore'

const demoUsers: MentionItem[] = [
  { id: 'user-1', label: 'Alice Johnson' },
  { id: 'user-2', label: 'Bob Smith' },
  { id: 'user-3', label: 'Carol White' },
  { id: 'user-4', label: 'David Brown' },
  { id: 'user-5', label: 'Eve Davis' },
]

export function useEditorConfig() {
  const pollStore = usePollStore()

  const customComponents: CustomComponentRegistration[] = [
    {
      name: 'interactivePoll',
      component: PollNodeView,
      atom: true,
      draggable: true,
      group: 'block',
      attrs: {
        entityId: { default: null },
      },
      slashCommand: {
        title: 'Poll',
        description: 'Insert an interactive poll',
        icon: IconListCheck,
        keywords: ['poll', 'survey', 'vote', 'question'],
      },
      confirmDelete: true,
      onDelete: (attrs) => {
        if (attrs.entityId) {
          pollStore.deletePoll(attrs.entityId as string)
        }
      },
    },
  ]

  async function searchMentions(query: string): Promise<MentionItem[]> {
    await new Promise((r) => setTimeout(r, 300))
    if (!query) return demoUsers
    const q = query.toLowerCase()
    return demoUsers.filter((u) => u.label.toLowerCase().includes(q))
  }

  return { customComponents, searchMentions }
}

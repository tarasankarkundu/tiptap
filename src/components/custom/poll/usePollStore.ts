import { reactive } from 'vue'

export interface PollOption {
  id: string
  text: string
  votes: number
}

export interface PollEntity {
  id: string
  question: string
  options: PollOption[]
  multiSelect: boolean
  voted: string[]
}

const STORAGE_KEY = 'meld-polls'

const store = reactive(new Map<string, PollEntity>())

// Hydrate from localStorage
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const entries: PollEntity[] = JSON.parse(raw)
    for (const poll of entries) {
      store.set(poll.id, poll)
    }
  }
} catch {
  // Ignore corrupt data
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(store.values())))
}

export function usePollStore() {
  function createPoll(data: Omit<PollEntity, 'id'>): string {
    const id = crypto.randomUUID()
    store.set(id, { ...data, id })
    persist()
    return id
  }

  function getPoll(id: string): PollEntity | undefined {
    return store.get(id)
  }

  function updatePoll(id: string, updates: Partial<Omit<PollEntity, 'id'>>) {
    const poll = store.get(id)
    if (!poll) return
    Object.assign(poll, updates)
    persist()
  }

  function deletePoll(id: string) {
    store.delete(id)
    persist()
  }

  return { createPoll, getPoll, updatePoll, deletePoll }
}

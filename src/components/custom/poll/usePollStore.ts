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

const store = reactive(new Map<string, PollEntity>())

export function usePollStore() {
  function createPoll(data: Omit<PollEntity, 'id'>): string {
    const id = crypto.randomUUID()
    store.set(id, { ...data, id })
    return id
  }

  function getPoll(id: string): PollEntity | undefined {
    return store.get(id)
  }

  function updatePoll(id: string, updates: Partial<Omit<PollEntity, 'id'>>) {
    const poll = store.get(id)
    if (!poll) return
    Object.assign(poll, updates)
  }

  function deletePoll(id: string) {
    store.delete(id)
  }

  return { createPoll, getPoll, updatePoll, deletePoll }
}

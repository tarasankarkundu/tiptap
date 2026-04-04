import { reactive, computed } from 'vue'

export interface MeldDocument {
  id: string
  title: string
  content: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'meld-documents'

const store = reactive(new Map<string, MeldDocument>())

// Hydrate from localStorage on first import
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const entries: MeldDocument[] = JSON.parse(raw)
    for (const doc of entries) {
      store.set(doc.id, doc)
    }
  }
} catch {
  // Ignore corrupt data
}

function persist() {
  const docs = Array.from(store.values())
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs))
}

export function useDocumentStore() {
  const allDocuments = computed(() =>
    Array.from(store.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  )

  function createDocument(title = 'Untitled'): MeldDocument {
    const now = new Date().toISOString()
    const doc: MeldDocument = {
      id: crypto.randomUUID(),
      title,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      createdAt: now,
      updatedAt: now,
    }
    store.set(doc.id, doc)
    persist()
    return doc
  }

  function getDocument(id: string): MeldDocument | undefined {
    return store.get(id)
  }

  function updateDocument(id: string, updates: Partial<Pick<MeldDocument, 'title' | 'content'>>) {
    const doc = store.get(id)
    if (!doc) return
    Object.assign(doc, updates, { updatedAt: new Date().toISOString() })
    persist()
  }

  function deleteDocument(id: string) {
    store.delete(id)
    persist()
  }

  return { allDocuments, createDocument, getDocument, updateDocument, deleteDocument }
}

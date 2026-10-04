import { browser } from '$app/environment'
import { packStore, unpackStore, type PackedStore, type Store } from './store'

/**
 * Stores a teacher chose to keep in this browser. This is a convenience, not a
 * safe: clearing site data, a private window or a different computer all start
 * with an empty list, which is why the teacher pages suggest bookmarking a
 * store's page to keep it for good.
 */
export type SavedStore = { id: string; savedAt: string; store: Store }

const storageKey = 'classgrocery-saved-stores'

export const saved = $state({ stores: browser ? load() : ([] as SavedStore[]) })

function load(): SavedStore[] {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as Array<{ id: string; savedAt: string; store: PackedStore }>
    if (!Array.isArray(stored)) return []
    return stored.flatMap((entry) => {
      const store = unpackStore(entry?.store)
      return store && typeof entry.id === 'string' ? [{ id: entry.id, savedAt: String(entry.savedAt), store }] : []
    })
  } catch {
    return []
  }
}

function persist() {
  try {
    const packed = saved.stores.map((entry) => ({ id: entry.id, savedAt: entry.savedAt, store: packStore(entry.store) }))
    localStorage.setItem(storageKey, JSON.stringify(packed))
  } catch {
    // Storage is full or switched off. The list still works until the page closes.
  }
}

/**
 * Saves a store, or updates the saved copy when `id` is given, and returns its
 * id. A copy is kept rather than the store itself, so later edits only reach
 * the list when they are saved again. Saving an unchanged store leaves its date
 * alone, so the list says when a store was last changed, not last opened.
 */
export function saveStore(store: Store, id: string | null = null) {
  const copy = $state.snapshot(store) as Store
  const index = saved.stores.findIndex((existing) => existing.id === id)
  if (index !== -1 && sameStore(saved.stores[index].store, copy)) return saved.stores[index].id

  const entry = { id: id ?? crypto.randomUUID(), savedAt: new Date().toISOString(), store: copy }
  if (index === -1) saved.stores.push(entry)
  else saved.stores[index] = entry
  persist()
  return entry.id
}

function sameStore(a: Store, b: Store) {
  return JSON.stringify(packStore(a)) === JSON.stringify(packStore(b))
}

export function forgetSavedStore(id: string) {
  saved.stores = saved.stores.filter((entry) => entry.id !== id)
  persist()
}

export function isSaved(id: string | null) {
  return id !== null && saved.stores.some((entry) => entry.id === id)
}

import { readPublicationDraft, removePublicationDraft, savePublicationDraft } from './draftStorage'

export type DraftImage = { dataUrl: string; size: number; name: string }
export type CompletePublicationDraft = {
  formData: Record<string, unknown>
  images: DraftImage[]
  step: number
  existingAmenities: string[]
  /** True only after a user changes a field or the gallery in this editing session. */
  edited?: boolean
}

const DB_NAME = 'cubitat-publication-drafts'
const STORE = 'drafts'
const queues = new Map<string, Promise<unknown>>()
const generations = new Map<string, number>()
export const completeDraftKey = (userId: string, propertyId?: string, draftId?: string) => draftId && draftId !== 'legacy'
  ? JSON.stringify([userId, propertyId ?? null, draftId])
  : JSON.stringify([userId, propertyId ?? null])

export function getCompleteDraftGeneration(userId: string, propertyId?: string, draftId?: string): number {
  return generations.get(completeDraftKey(userId, propertyId, draftId)) ?? 0
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('draft_storage_blocked'))
  })
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = action(tx.objectStore(STORE))
    tx.oncomplete = () => { db.close(); resolve(request.result) }
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? request.error) }
  })
}

function ordered<T>(key: string, task: () => Promise<T>): Promise<T> {
  const next = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(task)
  queues.set(key, next)
  void next.finally(() => { if (queues.get(key) === next) queues.delete(key) }).catch(() => {})
  return next
}

export function readCompleteDraft(userId: string, propertyId?: string, draftId?: string): Promise<CompletePublicationDraft | null> {
  const key = completeDraftKey(userId, propertyId, draftId)
  return ordered(key, async () => {
    const draft = await transaction('readonly', store => store.get(key)) as CompletePublicationDraft | undefined
    if (draft) return draft
    const legacy = propertyId ? null : readPublicationDraft(userId, draftId)
    return legacy ? { formData: legacy, images: [], step: 1, existingAmenities: [] } : null
  })
}

export function saveCompleteDraft(userId: string, draft: CompletePublicationDraft, propertyId?: string, draftId?: string, generation = getCompleteDraftGeneration(userId, propertyId, draftId)): Promise<void> {
  const key = completeDraftKey(userId, propertyId, draftId)
  return ordered(key, async () => {
    await transaction('readwrite', store => store.put(draft, key))
    // A save from an editor that was discarded must not recreate its metadata
    // after the deletion transaction has completed.
    if (getCompleteDraftGeneration(userId, propertyId, draftId) !== generation) {
      await transaction('readwrite', store => store.delete(key))
      return
    }
    // Small metadata copy keeps the existing account draft banner compatible.
    if (!propertyId) savePublicationDraft(userId, draft.formData, draftId)
  })
}

export function removeCompleteDraft(userId: string, propertyId?: string, draftId?: string): Promise<void> {
  const key = completeDraftKey(userId, propertyId, draftId)
  generations.set(key, getCompleteDraftGeneration(userId, propertyId, draftId) + 1)
  return ordered(key, async () => {
    await transaction('readwrite', store => store.delete(key))
    if (!propertyId) removePublicationDraft(userId, draftId)
  })
}

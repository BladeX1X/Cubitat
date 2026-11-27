export type MarketplaceDraftKind = 'service' | 'material'
export type MarketplaceDraft<T = Record<string, unknown>> = {
  id: string
  kind: MarketplaceDraftKind
  userId: string
  updatedAt: string
  value: T
  photos: File[]
}

const DATABASE = 'cubitat-marketplace-drafts'
const STORE = 'drafts'
const makeKey = (kind: MarketplaceDraftKind, userId: string, id: string) => JSON.stringify([kind, userId, id])

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('marketplace_draft_storage_blocked'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    const request = action(transaction.objectStore(STORE))
    transaction.oncomplete = () => { db.close(); resolve(request.result) }
    transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error ?? request.error) }
  })
}

export async function saveMarketplaceDraft<T>(draft: MarketplaceDraft<T>): Promise<void> {
  await withStore('readwrite', store => store.put(draft, makeKey(draft.kind, draft.userId, draft.id)))
}

export async function readMarketplaceDraft<T>(kind: MarketplaceDraftKind, userId: string, id: string): Promise<MarketplaceDraft<T> | null> {
  return (await withStore('readonly', store => store.get(makeKey(kind, userId, id))) as MarketplaceDraft<T> | undefined) ?? null
}

export async function listMarketplaceDrafts(kind: MarketplaceDraftKind, userId: string): Promise<MarketplaceDraft[]> {
  const drafts = await withStore('readonly', store => store.getAll()) as MarketplaceDraft[]
  return drafts.filter(draft => draft.kind === kind && draft.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function removeMarketplaceDraft(kind: MarketplaceDraftKind, userId: string, id: string): Promise<void> {
  await withStore('readwrite', store => store.delete(makeKey(kind, userId, id)))
}

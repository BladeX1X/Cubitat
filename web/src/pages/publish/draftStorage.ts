const LEGACY_DRAFT_KEY = 'cubitat_publish_draft'
const LEGACY_DRAFT_ID = 'legacy'

export type PublicationDraftSummary = {
  id: string
  formData: Record<string, unknown>
}

export function getPublicationDraftKey(userId: string, draftId?: string): string {
  return draftId && draftId !== LEGACY_DRAFT_ID
    ? `cubitat_publish_draft:${userId}:${draftId}`
    : `cubitat_publish_draft:${userId}`
}

function readJsonDraft(key: string): Record<string, unknown> | null {
  const rawDraft = localStorage.getItem(key)
  if (!rawDraft) return null

  try {
    return JSON.parse(rawDraft) as Record<string, unknown>
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

export function readPublicationDraft(userId: string, draftId?: string): Record<string, unknown> | null {
  // A pre-account draft has no trustworthy owner. Discard it before returning
  // either way, so a shared browser cannot hand it to the next signed-in user.
  localStorage.removeItem(LEGACY_DRAFT_KEY)
  return readJsonDraft(getPublicationDraftKey(userId, draftId))
}

export function listPublicationDrafts(userId: string): PublicationDraftSummary[] {
  const prefix = `${getPublicationDraftKey(userId)}:`
  const entries = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
  const drafts: PublicationDraftSummary[] = []
  for (const key of entries) {
    if (!key) continue
    const id = key.startsWith(prefix) ? key.slice(prefix.length) : key === getPublicationDraftKey(userId) ? LEGACY_DRAFT_ID : ''
    if (!id) continue
    const formData = readJsonDraft(key)
    if (formData) drafts.push({ id, formData })
  }
  return drafts
}

export function savePublicationDraft(userId: string, draft: object, draftId?: string): void {
  localStorage.setItem(getPublicationDraftKey(userId, draftId), JSON.stringify(draft))
}

export function removePublicationDraft(userId: string, draftId?: string): void {
  const key = getPublicationDraftKey(userId, draftId)
  localStorage.removeItem(key)
  if (!draftId || draftId === LEGACY_DRAFT_ID) localStorage.removeItem(LEGACY_DRAFT_KEY)
}

export function removeLegacyPublicationDraft(): void {
  localStorage.removeItem(LEGACY_DRAFT_KEY)
}

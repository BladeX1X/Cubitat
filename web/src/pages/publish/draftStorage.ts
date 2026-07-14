const LEGACY_DRAFT_KEY = 'cubitat_publish_draft'

export function getPublicationDraftKey(userId: string): string {
  return `cubitat_publish_draft:${userId}`
}

export function readPublicationDraft(userId: string): Record<string, unknown> | null {
  const scopedKey = getPublicationDraftKey(userId)
  const scopedDraft = localStorage.getItem(scopedKey)
  if (scopedDraft) return JSON.parse(scopedDraft) as Record<string, unknown>

  const legacyDraft = localStorage.getItem(LEGACY_DRAFT_KEY)
  if (!legacyDraft) return null

  const parsed = JSON.parse(legacyDraft) as Record<string, unknown>
  localStorage.setItem(scopedKey, legacyDraft)
  localStorage.removeItem(LEGACY_DRAFT_KEY)
  return parsed
}

export function savePublicationDraft(userId: string, draft: object): void {
  localStorage.setItem(getPublicationDraftKey(userId), JSON.stringify(draft))
}

export function removePublicationDraft(userId: string): void {
  localStorage.removeItem(getPublicationDraftKey(userId))
  localStorage.removeItem(LEGACY_DRAFT_KEY)
}

export function removeLegacyPublicationDraft(): void {
  localStorage.removeItem(LEGACY_DRAFT_KEY)
}

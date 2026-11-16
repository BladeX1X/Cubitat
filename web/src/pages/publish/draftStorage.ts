const LEGACY_DRAFT_KEY = 'cubitat_publish_draft'

export function getPublicationDraftKey(userId: string): string {
  return `cubitat_publish_draft:${userId}`
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

export function readPublicationDraft(userId: string): Record<string, unknown> | null {
  // A pre-account draft has no trustworthy owner. Discard it before returning
  // either way, so a shared browser cannot hand it to the next signed-in user.
  localStorage.removeItem(LEGACY_DRAFT_KEY)

  const scopedKey = getPublicationDraftKey(userId)
  const scopedDraft = readJsonDraft(scopedKey)
  if (scopedDraft) return scopedDraft
  return null
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

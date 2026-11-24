const HIDDEN_PROPERTY_IDS_KEY = 'cubitat:hidden-property-ids:v1'
const PROPERTY_NOTES_KEY = 'cubitat:property-notes:v1'

function readRecord(key: string): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? '{}')
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    }
  } catch {
    // Local preferences are optional; keep the listing usable if storage is blocked.
  }
  return {}
}

export function getHiddenPropertyIds(): string[] {
  return Object.keys(readRecord(HIDDEN_PROPERTY_IDS_KEY))
}

export function setHiddenPropertyIds(ids: string[]): void {
  try {
    window.localStorage.setItem(HIDDEN_PROPERTY_IDS_KEY, JSON.stringify(Object.fromEntries(ids.map((id) => [id, 'hidden']))))
  } catch {
    // Keep the current session usable if storage is blocked or full.
  }
}

export function getPersonalPropertyNote(propertyId: string): string {
  return readRecord(PROPERTY_NOTES_KEY)[propertyId] ?? ''
}

export function setPersonalPropertyNote(propertyId: string, note: string): boolean {
  try {
    const notes = readRecord(PROPERTY_NOTES_KEY)
    if (note.trim()) notes[propertyId] = note
    else delete notes[propertyId]
    window.localStorage.setItem(PROPERTY_NOTES_KEY, JSON.stringify(notes))
    return true
  } catch {
    return false
  }
}

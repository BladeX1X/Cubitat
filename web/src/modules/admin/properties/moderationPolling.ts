import type { ModerationProperty } from '../core/types'
import { fetchModerationPropertyResult } from './propertiesRepository'

const REEVALUATING_MESSAGE = 'Reevaluando con IA...'
const POLL_INTERVAL_MS = 1000
const MAX_POLL_ATTEMPTS = 30

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}

export async function waitForModerationResult(
  propertyId: string,
): Promise<Pick<ModerationProperty, 'status' | 'moderation_message'> | null> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const result = await fetchModerationPropertyResult(propertyId)
    if (result.status !== 'pending_review' || result.moderation_message !== REEVALUATING_MESSAGE) {
      return result
    }

    if (attempt < MAX_POLL_ATTEMPTS - 1) {
      await wait(POLL_INTERVAL_MS)
    }
  }

  return null
}

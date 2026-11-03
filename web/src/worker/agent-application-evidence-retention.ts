import { logWorkerEvent } from './logger'

const BUCKET = 'agent_application_documents'
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

export interface AgentApplicationEvidenceRetentionEnv {
  PHASE3_ENABLED?: string
  VITE_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

interface ClaimedEvidence {
  id: string
  user_id: string
  cv_path: string
  diploma_path: string
  attempts: number
}

export interface AgentApplicationEvidencePurgeSummary {
  claimed: number
  purged: number
  failed: number
}

type FetchFn = typeof fetch

const emptySummary = (): AgentApplicationEvidencePurgeSummary => ({ claimed: 0, purged: 0, failed: 0 })

function headers(key: string): HeadersInit {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

function isClaimedEvidence(value: unknown): value is ClaimedEvidence {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<ClaimedEvidence>
  if (typeof row.id !== 'string' || !new RegExp(`^${UUID}$`, 'i').test(row.id)
    || typeof row.user_id !== 'string' || !new RegExp(`^${UUID}$`, 'i').test(row.user_id)
    || typeof row.attempts !== 'number' || row.attempts < 1 || row.attempts > 3) return false
  const ownedPath = new RegExp(`^${row.user_id}/${row.id}/(?:cv|diploma)-${UUID}\\.(?:pdf|jpg|png)$`, 'i')
  return typeof row.cv_path === 'string' && ownedPath.test(row.cv_path)
    && typeof row.diploma_path === 'string' && ownedPath.test(row.diploma_path)
    && row.cv_path !== row.diploma_path
}

async function updatePurgeState(
  env: AgentApplicationEvidenceRetentionEnv,
  applicationId: string,
  action: 'complete_agent_application_evidence_purge' | 'release_agent_application_evidence_purge',
  fetchFn: FetchFn,
): Promise<boolean> {
  const response = await fetchFn(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/${action}`, {
    method: 'POST',
    headers: headers(env.SUPABASE_SERVICE_ROLE_KEY!),
    body: JSON.stringify({
      p_application_id: applicationId,
      ...(action.startsWith('release') ? { p_error_code: 'storage_delete_failed' } : {}),
    }),
  })
  return response.ok
}

/** Deletes private CV/title objects after the approved 30-day retention period. */
export async function purgeFinalAgentApplicationEvidence(
  env: AgentApplicationEvidenceRetentionEnv,
  fetchFn: FetchFn = fetch,
): Promise<AgentApplicationEvidencePurgeSummary> {
  if (env.PHASE3_ENABLED !== 'true' || !env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return emptySummary()

  let body: unknown
  try {
    const response = await fetchFn(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/claim_agent_application_evidence_for_purge`, {
      method: 'POST',
      headers: headers(env.SUPABASE_SERVICE_ROLE_KEY),
      body: JSON.stringify({ p_limit: 10 }),
    })
    if (!response.ok) {
      logWorkerEvent('warn', 'agent_application_purge_claim_failed', { status: response.status })
      return emptySummary()
    }
    body = await response.json()
  } catch {
    logWorkerEvent('warn', 'agent_application_purge_claim_failed', { reason: 'network_unavailable' })
    return emptySummary()
  }

  const claimed = Array.isArray(body) ? body.filter(isClaimedEvidence) : []
  const summary: AgentApplicationEvidencePurgeSummary = { claimed: claimed.length, purged: 0, failed: 0 }
  for (const application of claimed) {
    try {
      const response = await fetchFn(`${env.VITE_SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
        method: 'DELETE',
        headers: headers(env.SUPABASE_SERVICE_ROLE_KEY),
        body: JSON.stringify({ prefixes: [application.cv_path, application.diploma_path] }),
      })
      if (!response.ok) throw new Error('storage_delete_failed')
      const completed = await updatePurgeState(env, application.id, 'complete_agent_application_evidence_purge', fetchFn)
      if (!completed) throw new Error('purge_completion_failed')
      summary.purged += 1
    } catch {
      summary.failed += 1
      try {
        const released = await updatePurgeState(env, application.id, 'release_agent_application_evidence_purge', fetchFn)
        if (!released) logWorkerEvent('error', 'agent_application_purge_release_failed')
      } catch {
        logWorkerEvent('error', 'agent_application_purge_release_failed')
      }
      logWorkerEvent('warn', 'agent_application_purge_failed')
    }
  }
  return summary
}

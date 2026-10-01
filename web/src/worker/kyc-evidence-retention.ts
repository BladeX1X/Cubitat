import { logWorkerEvent } from './logger'

export interface KycEvidenceRetentionEnv {
  VITE_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

interface ClaimedKycEvidence {
  id: string
  document_path: string | null
  selfie_path: string | null
}

export interface KycEvidencePurgeSummary {
  claimed: number
  purged: number
  failed: number
}

type FetchFn = typeof fetch

const emptySummary = (): KycEvidencePurgeSummary => ({
  claimed: 0,
  purged: 0,
  failed: 0,
})

function serviceHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  }
}

function isClaimedEvidence(value: unknown): value is ClaimedKycEvidence {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ClaimedKycEvidence>
  return typeof candidate.id === 'string'
    && (typeof candidate.document_path === 'string' || typeof candidate.selfie_path === 'string')
}

async function invokePurgeRpc(
  env: KycEvidenceRetentionEnv,
  rpcName: 'complete_kyc_evidence_purge' | 'release_kyc_evidence_purge',
  requestId: string,
  fetchFn: FetchFn,
): Promise<boolean> {
  const response = await fetchFn(
    `${env.VITE_SUPABASE_URL}/rest/v1/rpc/${rpcName}`,
    {
      method: 'POST',
      headers: serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY!),
      body: JSON.stringify({ p_request_id: requestId }),
    },
  )
  return response.ok
}

export async function purgeApprovedKycEvidence(
  env: KycEvidenceRetentionEnv,
  fetchFn: FetchFn = fetch,
): Promise<KycEvidencePurgeSummary> {
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!env.VITE_SUPABASE_URL || !serviceRoleKey) return emptySummary()

  let claimed: ClaimedKycEvidence[]
  try {
    const claimResponse = await fetchFn(
      `${env.VITE_SUPABASE_URL}/rest/v1/rpc/claim_kyc_evidence_for_purge`,
      {
        method: 'POST',
        headers: serviceHeaders(serviceRoleKey),
        body: JSON.stringify({ p_limit: 25 }),
      },
    )
    if (!claimResponse.ok) {
      logWorkerEvent('warn', 'kyc_evidence_claim_failed', {
        status: claimResponse.status,
      })
      return emptySummary()
    }

    const body: unknown = await claimResponse.json()
    claimed = Array.isArray(body) ? body.filter(isClaimedEvidence) : []
  } catch {
    logWorkerEvent('warn', 'kyc_evidence_retention_unavailable')
    return emptySummary()
  }

  const summary: KycEvidencePurgeSummary = {
    claimed: claimed.length,
    purged: 0,
    failed: 0,
  }

  for (const evidence of claimed) {
    try {
      const storageResponse = await fetchFn(
        `${env.VITE_SUPABASE_URL}/storage/v1/object/kyc_documents`,
        {
          method: 'DELETE',
          headers: serviceHeaders(serviceRoleKey),
          body: JSON.stringify({
            prefixes: [evidence.document_path, evidence.selfie_path].filter(
              (path): path is string => typeof path === 'string' && path.length > 0,
            ),
          }),
        },
      )

      if (!storageResponse.ok) {
        summary.failed += 1
        await invokePurgeRpc(env, 'release_kyc_evidence_purge', evidence.id, fetchFn)
        continue
      }

      const completed = await invokePurgeRpc(
        env,
        'complete_kyc_evidence_purge',
        evidence.id,
        fetchFn,
      )
      if (completed) {
        summary.purged += 1
      } else {
        summary.failed += 1
      }
    } catch {
      summary.failed += 1
      try {
        await invokePurgeRpc(env, 'release_kyc_evidence_purge', evidence.id, fetchFn)
      } catch {
        // El reclamo expira a los 30 minutos y permite un reintento seguro.
      }
    }
  }

  if (summary.failed > 0) {
    logWorkerEvent('warn', 'kyc_evidence_retention_partial_failure')
  }

  return summary
}

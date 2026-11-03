import { logWorkerEvent } from './logger'

const BUCKET = 'agent_application_documents'
const SIGNED_URL_TTL_SECONDS = 120
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AgentApplicationDocumentsEnv {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  })
}

function serviceHeaders(key: string): HeadersInit {
  return { apikey: key, Authorization: `Bearer ${key}` }
}

function safeSignedUrl(value: unknown, baseUrl: string): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  try {
    const resolved = new URL(value, baseUrl)
    if (resolved.origin !== new URL(baseUrl).origin || !resolved.pathname.startsWith(`/storage/v1/object/sign/${BUCKET}/`)) return null
    return resolved.toString()
  } catch {
    return null
  }
}

async function signDocument(path: string, env: AgentApplicationDocumentsEnv, fetchFn: typeof fetch): Promise<string | null> {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const response = await fetchFn(`${env.VITE_SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${encodedPath}`, {
    method: 'POST',
    headers: {
      ...serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY!),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
  })
  if (!response.ok) return null
  const payload = await response.json() as { signedURL?: unknown }
  return safeSignedUrl(payload.signedURL, env.VITE_SUPABASE_URL)
}

/** Releases short-lived document links only to a session authorized as admin AAL2 by Postgres. */
export async function handleAgentApplicationDocumentLinks(
  request: Request,
  applicationId: string,
  env: AgentApplicationDocumentsEnv,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })
  if (!UUID_PATTERN.test(applicationId)) return json(400, { error: 'Invalid application id' })
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.VITE_SUPABASE_ANON_KEY) return json(503, { error: 'Application service unavailable' })

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ') || authorization.length > 4096) return json(401, { error: 'Unauthorized' })

  try {
    const aalResponse = await fetchFn(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/is_admin_aal2`, {
      method: 'POST',
      headers: {
        apikey: env.VITE_SUPABASE_ANON_KEY,
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    if (!aalResponse.ok || await aalResponse.json() !== true) return json(403, { error: 'Admin AAL2 required' })

    const appResponse = await fetchFn(
      `${env.VITE_SUPABASE_URL}/rest/v1/agent_applications?select=cv_path,diploma_path&id=eq.${encodeURIComponent(applicationId)}&limit=1`,
      { headers: serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY) },
    )
    if (!appResponse.ok) throw new Error('application_lookup_failed')
    const rows = await appResponse.json() as Array<{ cv_path?: unknown; diploma_path?: unknown }>
    const row = rows[0]
    if (!row) return json(404, { error: 'Application not found' })
    if (row.cv_path === null || row.diploma_path === null) {
      return json(410, { error: 'Application documents have passed their retention period' })
    }
    const ownedApplicationPath = new RegExp(`^[0-9a-f-]{36}/${applicationId}/(?:cv|diploma)-[0-9a-f-]{36}\\.(?:pdf|jpg|png)$`, 'i')
    if (typeof row.cv_path !== 'string' || typeof row.diploma_path !== 'string'
      || !ownedApplicationPath.test(row.cv_path) || !ownedApplicationPath.test(row.diploma_path)) {
      throw new Error('invalid_application_document_path')
    }

    const [cv, diploma] = await Promise.all([
      signDocument(row.cv_path, env, fetchFn),
      signDocument(row.diploma_path, env, fetchFn),
    ])
    if (!cv || !diploma) throw new Error('document_signing_failed')
    return json(200, { cv_url: cv, diploma_url: diploma, expires_in: SIGNED_URL_TTL_SECONDS })
  } catch {
    logWorkerEvent('warn', 'agent_application_document_link_failed')
    return json(503, { error: 'Could not create private document links' })
  }
}

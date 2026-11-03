import { cubanProvinces } from '../shared/data/cubaLocations'
import { readBoundedBytes } from './boundedJson'
import { logWorkerEvent } from './logger'

export type AgentApplicationDocumentMime = 'application/pdf' | 'image/jpeg' | 'image/png'
export const MAX_AGENT_APPLICATION_DOCUMENT_BYTES = 10 * 1024 * 1024
const MAX_AGENT_APPLICATION_REQUEST_BYTES = MAX_AGENT_APPLICATION_DOCUMENT_BYTES * 2 + 64 * 1024
const APPLICATION_BUCKET = 'agent_application_documents'

export type AgentApplicationDocumentInspection =
  | { ok: true; mime: AgentApplicationDocumentMime; extension: 'pdf' | 'jpg' | 'png' }
  | { ok: false; reason: 'empty' | 'too_large' | 'unsupported' }

const DOCUMENT_SIGNATURES: ReadonlyArray<{
  mime: AgentApplicationDocumentMime
  matches: (bytes: Uint8Array) => boolean
}> = [
  { mime: 'application/pdf', matches: (bytes) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  { mime: 'image/jpeg', matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]) },
  { mime: 'image/png', matches: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
]

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return bytes.byteLength >= signature.length && signature.every((byte, index) => bytes[index] === byte)
}

/** Identifies accepted application documents from their bytes, never from client-supplied MIME metadata. */
export function detectAgentApplicationDocumentMime(bytes: Uint8Array): AgentApplicationDocumentMime | null {
  return DOCUMENT_SIGNATURES.find(({ matches }) => matches(bytes))?.mime ?? null
}

/** Validates the upload size and derives its accepted format from its actual bytes. */
export function inspectAgentApplicationDocument(bytes: Uint8Array): AgentApplicationDocumentInspection {
  if (bytes.byteLength === 0) return { ok: false, reason: 'empty' }
  if (bytes.byteLength > MAX_AGENT_APPLICATION_DOCUMENT_BYTES) return { ok: false, reason: 'too_large' }

  const mime = detectAgentApplicationDocumentMime(bytes)
  if (!mime) return { ok: false, reason: 'unsupported' }

  const extension = mime === 'application/pdf' ? 'pdf' : mime === 'image/jpeg' ? 'jpg' : 'png'
  return { ok: true, mime, extension }
}

export interface AgentApplicationSubmissionEnv {
  PHASE3_ENABLED?: string
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

type FetchFn = typeof fetch
type UploadedDocument = { bytes: Uint8Array; mime: AgentApplicationDocumentMime; extension: string }

function response(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  })
}

function isFileEntry(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value !== 'string'
    && typeof value.arrayBuffer === 'function'
    && Number.isSafeInteger(value.size)
}

function readTextField(form: FormData, name: string, maxLength: number): string | null {
  const value = form.get(name)
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null
}

async function readDocument(file: File): Promise<UploadedDocument | null> {
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_AGENT_APPLICATION_DOCUMENT_BYTES) return null
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.byteLength !== file.size) return null
  const inspected = inspectAgentApplicationDocument(bytes)
  return inspected.ok ? { bytes, mime: inspected.mime, extension: inspected.extension } : null
}

function serviceHeaders(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  }
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

async function removeUploadedObjects(
  paths: string[],
  env: AgentApplicationSubmissionEnv,
  fetchFn: FetchFn,
): Promise<boolean> {
  if (paths.length === 0) return true
  const response = await fetchFn(`${env.VITE_SUPABASE_URL}/storage/v1/object/${APPLICATION_BUCKET}`, {
    method: 'DELETE',
    headers: { ...serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY!), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: paths }),
  })
  return response.ok
}

/** Authenticated submission endpoint implementation; callers must apply the per-user rate limit first. */
export async function handleAgentApplicationSubmission(
  request: Request,
  env: AgentApplicationSubmissionEnv,
  userId: string,
  fetchFn: FetchFn = fetch,
): Promise<Response> {
  if (env.PHASE3_ENABLED !== 'true') return response(404, 'Not found')
  if (request.method !== 'POST') return response(405, 'Method not allowed')
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data;')) {
    return response(400, 'Expected multipart form data')
  }

  if (!userId) return response(401, 'Unauthorized')
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.VITE_SUPABASE_URL) return response(503, 'Application service unavailable')

  const bounded = await readBoundedBytes(request, MAX_AGENT_APPLICATION_REQUEST_BYTES)
  if (!bounded.ok) return response(bounded.status, bounded.status === 413 ? 'Request too large' : 'Invalid request body')

  let form: FormData
  try {
    const boundedRequest = new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': request.headers.get('content-type')! },
      body: asArrayBuffer(bounded.value),
    })
    form = await boundedRequest.formData()
  } catch {
    return response(400, 'Invalid multipart form data')
  }

  const allowedFields = new Set(['province', 'education_title', 'experience_summary', 'cv', 'diploma'])
  if ([...form.keys()].some((key) => !allowedFields.has(key))
    || ['province', 'education_title', 'cv', 'diploma'].some((key) => form.getAll(key).length !== 1)
    || form.getAll('experience_summary').length > 1) {
    return response(400, 'Invalid application fields')
  }

  const province = readTextField(form, 'province', 80)
  const educationTitle = readTextField(form, 'education_title', 160)
  const experience = form.get('experience_summary')
  if (experience !== null && typeof experience !== 'string') return response(400, 'Invalid application details')
  const experienceSummary = typeof experience === 'string' ? experience.trim() : ''
  if (!province || !cubanProvinces.includes(province) || !educationTitle || experienceSummary.length > 1200) {
    return response(400, 'Invalid application details')
  }
  const cvFile = form.get('cv')
  const diplomaFile = form.get('diploma')
  if (!isFileEntry(cvFile) || !isFileEntry(diplomaFile)) return response(400, 'CV and diploma are required')

  let cv: UploadedDocument | null
  let diploma: UploadedDocument | null
  try {
    ;[cv, diploma] = await Promise.all([readDocument(cvFile), readDocument(diplomaFile)])
  } catch {
    return response(400, 'Could not read application documents')
  }
  if (!cv || !diploma) return response(400, 'Documents must be PDF, JPG or PNG and no larger than 10 MiB')

  const applicationId = crypto.randomUUID()
  const cvPath = `${userId}/${applicationId}/cv-${crypto.randomUUID()}.${cv.extension}`
  const diplomaPath = `${userId}/${applicationId}/diploma-${crypto.randomUUID()}.${diploma.extension}`
  const paths: string[] = []
  for (const item of [
    { path: cvPath, document: cv },
    { path: diplomaPath, document: diploma },
  ]) {
    try {
      const uploaded = await fetchFn(
        `${env.VITE_SUPABASE_URL}/storage/v1/object/${APPLICATION_BUCKET}/${item.path}`,
        {
          method: 'POST',
          headers: {
            ...serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
            'Content-Type': item.document.mime,
            'Cache-Control': 'no-store',
          },
          body: asArrayBuffer(item.document.bytes),
        },
      )
      if (!uploaded.ok) throw new Error('Storage upload failed')
      paths.push(item.path)
    } catch {
      try {
        const removed = await removeUploadedObjects(paths, env, fetchFn)
        if (!removed) logWorkerEvent('error', 'agent_application_upload_cleanup_failed')
      } catch {
        logWorkerEvent('error', 'agent_application_upload_cleanup_failed')
      }
      logWorkerEvent('warn', 'agent_application_submission_failed', { phase: 'storage' })
      return response(503, 'Could not store application documents')
    }
  }

  try {
    const saved = await fetchFn(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/submit_agent_application_trusted`, {
      method: 'POST',
      headers: { ...serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_application_id: applicationId,
        p_user_id: userId,
        p_province: province,
        p_education_title: educationTitle,
        p_experience_summary: experienceSummary || null,
        p_cv_path: cvPath,
        p_diploma_path: diplomaPath,
      }),
    })
    if (!saved.ok) throw new Error('Application persistence failed')
  } catch {
    try {
      const removed = await removeUploadedObjects(paths, env, fetchFn)
      if (!removed) logWorkerEvent('error', 'agent_application_upload_cleanup_failed')
    } catch {
      logWorkerEvent('error', 'agent_application_upload_cleanup_failed')
    }
    logWorkerEvent('warn', 'agent_application_submission_failed', { phase: 'database' })
    return response(503, 'Could not submit application')
  }

  logWorkerEvent('info', 'agent_application_submitted')
  return new Response(JSON.stringify({ id: applicationId, status: 'submitted' }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  })
}

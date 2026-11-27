import { supabase } from '../../../shared/lib/supabaseClient'

export type AgentApplicationStatus = 'submitted' | 'reviewing' | 'waitlisted'

export type PendingAgentApplication = {
  id: string
  user_id: string
  province: string
  education_title: string
  experience_summary: string | null
  status: AgentApplicationStatus
  created_at: string
}

export type AgentApplicationDocumentLinks = {
  cv_url: string
  diploma_url: string
  expires_in: number
}

export type RejectedAgentApplicationEvent = {
  application_id: string
  to_status: 'rejected'
  reason: string | null
  created_at: string
  agent_applications: { education_title: string; province: string }
}

export type ActiveAgent = {
  agent_id: string
  full_name: string
  province: string
  assigned_at: string | null
  account_role: 'agent' | 'admin'
}

export const AGENT_APPLICATIONS_PAGE_SIZE = 20

function getSafeRpcError(
  error: unknown,
  depth = 0,
): { code: string; name: string; status: number | null; message: string; keys: string[] } {
  if (typeof error === 'string') {
    const trimmed = error.trim()
    if (depth < 3 && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        return getSafeRpcError(JSON.parse(trimmed), depth + 1)
      } catch {
        // Treat non-JSON server text as a message; never display it verbatim.
      }
    }
    const normalized = error.toUpperCase()
    const codeMatch = normalized.match(/\b(?:[A-Z0-9]{5}|PGRST\d{3})\b/)
    const code = codeMatch?.[0] ?? ''
    return { code, name: 'String', status: null, message: error.toLowerCase().slice(0, 300), keys: [] }
  }
  if (!error || typeof error !== 'object') {
    return { code: '', name: typeof error, status: null, message: '', keys: [] }
  }

  const value = error as Record<string, unknown>
  const nested = depth < 3 && 'error' in value ? getSafeRpcError(value.error, depth + 1) : null
  const code = typeof value.code === 'string' ? value.code : nested?.code ?? ''
  const name = typeof value.name === 'string' ? value.name : nested?.name ?? 'Object'
  const status = typeof value.status === 'number' && Number.isInteger(value.status)
    ? value.status
    : nested?.status ?? null
  const message = typeof value.message === 'string'
    ? value.message.toLowerCase().slice(0, 300)
    : nested?.message ?? ''
  const keys = Object.keys(value).filter((key) => /^[a-z][a-z0-9_]{0,30}$/i.test(key)).slice(0, 8)
  return { code, name, status, message, keys: nested ? nested.keys : keys }
}

function getReviewRpcErrorMessage(error: unknown): string {
  const diagnostic = getSafeRpcError(error)
  const { code, status, name, message } = diagnostic
  if (code === '42501' || status === 403 || /admin aal2 required|permission denied/i.test(message)) {
    return 'No tienes permiso de administrador para guardar esta decisión.'
  }
  if (code === 'P0002') return 'La postulación ya no existe. Actualiza la lista.'
  if (code === '22023' || /kyc|verificaci[oó]n|estado cannot transition/i.test(message)) {
    return 'No se pudo aplicar la decisión. Comprueba el estado de la postulación y que el perfil cumpla los requisitos de KYC.'
  }
  if (code === '23505') return 'El perfil o la postulación ya ocupa una plaza de agente. Actualiza la lista para ver el estado actual.'
  if (code === 'PGRST202' || code === 'PGRST203' || /schema cache|function .* does not exist/i.test(message)) {
    return 'La base de datos aún no reconoce la función de revisión. Requiere actualizar la caché del esquema.'
  }
  if (/operaci[oó]n no permitida/i.test(message)) {
    return 'El Worker de producción bloqueó esta función administrativa. Requiere actualizar su lista de funciones administrativas permitidas.'
  }
  if (name === 'TypeError' || /failed to fetch|networkerror|network request failed|fetch failed|timed? ?out/i.test(message)) {
    return 'No se pudo establecer conexión con Supabase para guardar la decisión. Comprueba la conexión e inténtalo de nuevo.'
  }

  const detail = code || (status !== null ? `HTTP ${status}` : '')
  if (!detail) {
    return 'No se pudo guardar la decisión administrativa. Actualiza la lista e inténtalo de nuevo.'
  }
  return `No se pudo guardar la decisión administrativa (diagnóstico: ${detail}).`
}

async function readDocumentError(response: Response): Promise<string> {
  let code = ''
  try {
    const body = await response.json() as { error?: unknown }
    if (typeof body.error === 'string') code = body.error
  } catch {
    // Fall back to the HTTP status when the Worker does not return JSON.
  }

  if (response.status === 401 || code === 'session_required') return 'La sesión expiró. Inicia sesión otra vez.'
  if (response.status === 403 || code === 'admin_aal2_required') return 'No tienes permiso de administrador para abrir estos documentos.'
  if (response.status === 404 || code === 'application_not_found') return 'La postulación ya no está disponible en la cola. Actualiza la lista.'
  if (response.status === 410 || code === 'documents_expired') return 'El plazo de conservación terminó; los documentos ya fueron eliminados.'
  if (response.status === 429) return 'Se alcanzó el límite temporal para abrir documentos. Espera unos minutos e inténtalo de nuevo.'
  if (code === 'admin_access_check_unavailable') return 'No se pudo comprobar el permiso administrativo. Inténtalo de nuevo más tarde.'
  if (code === 'application_lookup_unavailable') return 'No se pudo consultar la postulación en la base de datos.'
  if (code === 'document_signing_failed') return 'Supabase Storage no pudo generar los enlaces privados de los documentos.'
  if (code === 'application_documents_invalid') return 'La postulación tiene rutas de documentos incompletas o inválidas; requiere revisión técnica.'
  return `No se pudieron abrir los documentos (HTTP ${response.status}). Inténtalo de nuevo o comparte este código con soporte.`
}

export async function fetchPendingAgentApplications(page: number): Promise<{ items: PendingAgentApplication[]; total: number }> {
  const from = page * AGENT_APPLICATIONS_PAGE_SIZE
  const to = from + AGENT_APPLICATIONS_PAGE_SIZE - 1
  const { data, error, count } = await supabase
    .from('agent_applications')
    .select('id,user_id,province,education_title,experience_summary,status,created_at', { count: 'exact' })
    .in('status', ['submitted', 'reviewing', 'waitlisted'])
    .order('created_at', { ascending: true })
    .range(from, to)
  if (error) throw new Error('No se pudieron cargar las postulaciones.')
  return { items: (data ?? []) as PendingAgentApplication[], total: count ?? 0 }
}

export async function fetchRejectedAgentApplicationEvents(page: number): Promise<{ items: RejectedAgentApplicationEvent[]; total: number }> {
  const from = page * AGENT_APPLICATIONS_PAGE_SIZE
  const to = from + AGENT_APPLICATIONS_PAGE_SIZE - 1
  const { data, error, count } = await supabase
    .from('agent_application_events')
    .select('application_id,to_status,reason,created_at,agent_applications!inner(education_title,province)', { count: 'exact' })
    .eq('to_status', 'rejected')
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw new Error('No se pudo cargar el historial de rechazos.')
  return { items: (data ?? []) as unknown as RejectedAgentApplicationEvent[], total: count ?? 0 }
}

export async function fetchActiveAgentsForModeration(): Promise<ActiveAgent[]> {
  const { data, error } = await supabase.rpc('list_active_agents_for_moderation')
  if (error) {
    throw new Error(getReviewRpcErrorMessage(error).replace(
      'No se pudo guardar la decisión administrativa',
      'No se pudo cargar la lista de agentes activos',
    ))
  }
  return (data ?? []) as ActiveAgent[]
}

export async function revokeAgentAccess(agentId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_agent_access', {
    p_agent_id: agentId,
    p_reason: reason.trim(),
  })
  if (error) {
    const diagnostic = getSafeRpcError(error)
    if (diagnostic.code === 'P0002') throw new Error('El agente ya no está activo. Actualiza la lista.')
    if (diagnostic.code === '22023') throw new Error('Escribe un motivo de entre 3 y 500 caracteres.')
    throw new Error(getReviewRpcErrorMessage(error).replace('la decisión', 'la revocación'))
  }
}

export async function fetchAgentApplicationDocumentLinks(applicationId: string): Promise<AgentApplicationDocumentLinks> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.access_token) throw new Error('La sesión expiró. Inicia sesión otra vez.')

  const response = await fetch(`/api/phase3/agent-applications/${encodeURIComponent(applicationId)}/documents`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(await readDocumentError(response))
  }
  return await response.json() as AgentApplicationDocumentLinks
}

export async function reviewAgentApplication(
  applicationId: string,
  status: 'reviewing' | 'waitlisted' | 'rejected' | 'approved',
  reason?: string,
): Promise<'reviewing' | 'waitlisted' | 'rejected' | 'approved'> {
  const { data, error } = await supabase.rpc('review_agent_application', {
    p_application_id: applicationId,
    p_status: status,
    p_reason: reason?.trim() || null,
  })
  if (error) {
    throw new Error(getReviewRpcErrorMessage(error))
  }
  if (data !== 'reviewing' && data !== 'waitlisted' && data !== 'rejected' && data !== 'approved') {
    throw new Error('El servidor devolvió un estado de postulación inesperado.')
  }
  return data
}

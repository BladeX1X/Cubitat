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

export const AGENT_APPLICATIONS_PAGE_SIZE = 20

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

export async function fetchAgentApplicationDocumentLinks(applicationId: string): Promise<AgentApplicationDocumentLinks> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.access_token) throw new Error('La sesión expiró. Inicia sesión otra vez.')

  const response = await fetch(`/api/phase3/agent-applications/${encodeURIComponent(applicationId)}/documents`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  })
  if (!response.ok) {
    if (response.status === 403) throw new Error('Se requiere una sesión administrativa AAL2 para ver documentos.')
    throw new Error('No se pudieron abrir los documentos de esta postulación.')
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
  if (error) throw new Error('No se pudo guardar la decisión administrativa.')
  if (data !== 'reviewing' && data !== 'waitlisted' && data !== 'rejected' && data !== 'approved') {
    throw new Error('El servidor devolvió un estado de postulación inesperado.')
  }
  return data
}

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, FileText, RefreshCw, ShieldCheck, UserRoundX } from 'lucide-react'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '../components/AdminStates'
import { AdminPagination } from '../components/AdminPagination'
import { Button } from '../../../shared/ui/button'
import { Textarea } from '../../../shared/ui/textarea'
import {
  fetchAgentApplicationDocumentLinks,
  fetchActiveAgentsForModeration,
  fetchPendingAgentApplications,
  fetchRejectedAgentApplicationEvents,
  reviewAgentApplication,
  revokeAgentAccess,
  AGENT_APPLICATIONS_PAGE_SIZE,
  type AgentApplicationDocumentLinks,
  type ActiveAgent,
  type PendingAgentApplication,
  type RejectedAgentApplicationEvent,
} from './agentApplicationsRepository'

const SIGNED_LINK_LIFETIME_MS = 120_000

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function AgentApplicationsModerationTab() {
  const [applications, setApplications] = useState<PendingAgentApplication[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [linksByApplication, setLinksByApplication] = useState<Record<string, AgentApplicationDocumentLinks>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [loadingDocumentsId, setLoadingDocumentsId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [rejectingApplicationId, setRejectingApplicationId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [rejectionEvents, setRejectionEvents] = useState<RejectedAgentApplicationEvent[]>([])
  const [historyPage, setHistoryPage] = useState(0)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [activeAgents, setActiveAgents] = useState<ActiveAgent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [revokingAgentId, setRevokingAgentId] = useState<string | null>(null)
  const [revocationTargetId, setRevocationTargetId] = useState<string | null>(null)
  const [revocationReason, setRevocationReason] = useState('')

  const loadActiveAgents = useCallback(async () => {
    setAgentsLoading(true)
    setAgentsError(null)
    try {
      setActiveAgents(await fetchActiveAgentsForModeration())
    } catch (cause: unknown) {
      setAgentsError(cause instanceof Error ? cause.message : 'No se pudo cargar la lista de agentes activos.')
    } finally {
      setAgentsLoading(false)
    }
  }, [])

  const load = useCallback(async (targetPage: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchPendingAgentApplications(targetPage)
      setApplications(result.items)
      setTotal(result.total)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las postulaciones.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(page) }, [load, page])
  useEffect(() => { void loadActiveAgents() }, [loadActiveAgents])

  async function loadRejectionHistory(targetPage: number, append = false) {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const result = await fetchRejectedAgentApplicationEvents(targetPage)
      setRejectionEvents((current) => append ? [...current, ...result.items] : result.items)
      setHistoryTotal(result.total)
      setHistoryPage(targetPage)
    } catch (cause: unknown) {
      setHistoryError(cause instanceof Error ? cause.message : 'No se pudo cargar el historial de rechazos.')
    } finally {
      setHistoryLoading(false)
    }
  }

  function toggleRejectionHistory() {
    const nextOpen = !historyOpen
    setHistoryOpen(nextOpen)
    if (nextOpen && rejectionEvents.length === 0 && !historyLoading) void loadRejectionHistory(0)
  }

  async function showDocuments(application: PendingAgentApplication) {
    setLoadingDocumentsId(application.id)
    setDocumentError(null)
    try {
      const links = await fetchAgentApplicationDocumentLinks(application.id)
      setLinksByApplication((current) => ({ ...current, [application.id]: links }))
      window.setTimeout(() => {
        setLinksByApplication((current) => {
          if (current[application.id] !== links) return current
          const remaining = { ...current }
          delete remaining[application.id]
          return remaining
        })
      }, Math.min(links.expires_in * 1000, SIGNED_LINK_LIFETIME_MS))
    } catch (cause: unknown) {
      setDocumentError(cause instanceof Error ? cause.message : 'No se pudieron abrir los documentos.')
    } finally {
      setLoadingDocumentsId(null)
    }
  }

  async function saveReviewAction(application: PendingAgentApplication, status: 'reviewing' | 'waitlisted' | 'rejected' | 'approved', reason?: string) {
    setActionLoadingId(application.id)
    setActionError(null)
    setActionMessage(null)
    try {
      const result = await reviewAgentApplication(application.id, status, reason)
      if (status === 'approved') {
        setActionMessage(result === 'approved'
          ? 'Postulación aprobada y plaza provincial asignada. El perfil tenía KYC aprobado.'
          : 'La provincia ya tiene cuatro agentes activos. La postulación quedó en lista de espera.')
      }
      setRejectingApplicationId(null)
      setRejectionReason('')
      await load(page)
    } catch (cause: unknown) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo guardar la acción administrativa.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function confirmAgentRevocation(agent: ActiveAgent) {
    setRevokingAgentId(agent.agent_id)
    setActionError(null)
    setActionMessage(null)
    try {
      await revokeAgentAccess(agent.agent_id, revocationReason)
      setRevocationTargetId(null)
      setRevocationReason('')
      const slotMessage = agent.province === 'Sin plaza provincial asignada'
        ? 'No tenía una plaza provincial asignada.'
        : `La plaza de ${agent.province} quedó libre.`
      setActionMessage(`Se retiró el acceso de agente a ${agent.full_name}. Su cuenta y anuncios se conservaron. ${slotMessage}`)
      await Promise.all([loadActiveAgents(), load(page)])
    } catch (cause: unknown) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo retirar el acceso de agente.')
    } finally {
      setRevokingAgentId(null)
    }
  }

  return (
    <section aria-labelledby="agent-applications-title" className="space-y-4">
      <header className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#035f53]"><ShieldCheck className="h-4 w-4" /> Revisión con sesión AAL2</p>
          <h2 id="agent-applications-title" className="mt-1 text-lg font-bold text-neutral-900">Postulaciones de agentes</h2>
          <p className="mt-1 text-sm text-neutral-600">Los CV y títulos permanecen privados; sus enlaces expiran en dos minutos.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => { void load(page); void loadActiveAgents() }}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
      </header>

      {documentError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{documentError}</p>}
      {actionError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
      {actionMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{actionMessage}</p>}
      <section aria-labelledby="active-agents-title" className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <header>
          <h3 id="active-agents-title" className="text-base font-bold text-neutral-900">Agentes activos</h3>
          <p className="mt-1 text-sm text-neutral-600">Retirar el acceso conserva la cuenta, las publicaciones y el historial. La plaza provincial se libera.</p>
        </header>
        {agentsLoading ? <AdminLoadingState message="Cargando agentes activos..." /> : null}
        {!agentsLoading && agentsError ? <AdminErrorState message={agentsError} onRetry={() => void loadActiveAgents()} /> : null}
        {!agentsLoading && !agentsError && activeAgents.length === 0 ? <AdminEmptyState title="No hay agentes activos" message="Los perfiles habilitados como agentes aparecerán aquí." /> : null}
        {!agentsLoading && !agentsError && activeAgents.length > 0 ? <div className="space-y-3">{activeAgents.map((agent) => (
          <article key={agent.agent_id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h4 className="break-words font-semibold text-neutral-900">{agent.full_name}</h4>
              <p className="text-sm text-neutral-600">{agent.province} · Agente activo · ID {agent.agent_id.slice(0, 8)}</p>
            </div>
            {revocationTargetId === agent.agent_id ? <div className="w-full space-y-2 sm:max-w-xl">
              <label htmlFor={`agent-revocation-reason-${agent.agent_id}`} className="block text-sm font-semibold text-neutral-800">Motivo para retirar el acceso</label>
              <Textarea id={`agent-revocation-reason-${agent.agent_id}`} value={revocationReason} maxLength={500} onChange={(event) => setRevocationReason(event.target.value)} placeholder="Describe brevemente la razón administrativa." />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="border-red-600 text-red-700 hover:bg-red-50" disabled={revokingAgentId === agent.agent_id || revocationReason.trim().length < 3} onClick={() => void confirmAgentRevocation(agent)}>{revokingAgentId === agent.agent_id ? 'Guardando...' : 'Confirmar retiro'}</Button>
                <Button type="button" variant="outline" disabled={revokingAgentId === agent.agent_id} onClick={() => { setRevocationTargetId(null); setRevocationReason('') }}>Cancelar</Button>
              </div>
            </div> : <Button type="button" variant="outline" className="w-full border-red-200 text-red-700 hover:bg-red-50 sm:w-auto" onClick={() => { setRevocationTargetId(agent.agent_id); setRevocationReason('') }}><UserRoundX className="mr-2 h-4 w-4" />Retirar acceso</Button>}
          </article>
        ))}</div> : null}
      </section>

      <section aria-labelledby="agent-applications-queue-title" className="space-y-3">
        <h3 id="agent-applications-queue-title" className="text-base font-bold text-neutral-900">Postulaciones pendientes</h3>
        {loading ? <AdminLoadingState message="Cargando postulaciones de agentes..." /> : null}
        {!loading && error ? <AdminErrorState message={error} onRetry={() => void load(page)} /> : null}
        {!loading && !error && total === 0 ? <AdminEmptyState title="No hay postulaciones pendientes" message="Las nuevas solicitudes aparecerán aquí para revisión administrativa." /> : null}
      {!loading && !error && total > 0 && <div className="space-y-3">
        {applications.map((application) => {
          const links = linksByApplication[application.id]
          return (
            <article key={application.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words text-base font-bold text-neutral-900">{application.education_title}</h3>
                  <p className="mt-1 text-sm text-neutral-700">{application.province} · {application.status === 'submitted' ? 'Recibida' : application.status === 'reviewing' ? 'En revisión' : 'Lista de espera'}</p>
                  <p className="mt-1 text-xs text-neutral-500">Recibida {formatDate(application.created_at)} · ID {application.id.slice(0, 8)}</p>
                  {application.experience_summary && <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">{application.experience_summary}</p>}
                </div>
                <Button type="button" className="w-full shrink-0 sm:w-auto" disabled={loadingDocumentsId === application.id} onClick={() => void showDocuments(application)}>
                  <FileText className="mr-2 h-4 w-4" />{loadingDocumentsId === application.id ? 'Preparando enlaces...' : 'Ver documentos'}
                </Button>
              </div>
              {links && <div className="mt-4 flex flex-col gap-2 border-t border-neutral-100 pt-3 sm:flex-row">
                <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-[#035f53] hover:bg-neutral-50" href={links.cv_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Abrir currículum</a>
                <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-[#035f53] hover:bg-neutral-50" href={links.diploma_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Abrir título</a>
                <span className="self-center text-xs text-neutral-500">Enlaces temporales; vuelve a solicitarlos si expiran.</span>
              </div>}
              <div className="mt-4 flex flex-col gap-2 border-t border-neutral-100 pt-3 sm:flex-row sm:flex-wrap">
                <p className="w-full text-xs text-neutral-600">Al aprobar, el servidor confirma el KYC y asigna una plaza solo si quedan menos de cuatro agentes activos en esta provincia; de lo contrario, conserva la solicitud en espera.</p>
                <Button type="button" disabled={actionLoadingId === application.id} onClick={() => void saveReviewAction(application, 'approved')}>{actionLoadingId === application.id ? 'Guardando...' : 'Aprobar y asignar plaza'}</Button>
                {application.status !== 'reviewing' && <Button type="button" variant="outline" disabled={actionLoadingId === application.id} onClick={() => void saveReviewAction(application, 'reviewing')}>Iniciar revisión</Button>}
                {application.status !== 'waitlisted' && <Button type="button" variant="outline" disabled={actionLoadingId === application.id} onClick={() => void saveReviewAction(application, 'waitlisted')}>Enviar a lista de espera</Button>}
                {rejectingApplicationId === application.id ? (
                  <div className="w-full space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                    <label htmlFor={`rejection-reason-${application.id}`} className="block text-sm font-semibold text-neutral-800">Motivo del rechazo</label>
                    <Textarea id={`rejection-reason-${application.id}`} value={rejectionReason} maxLength={500} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Explica brevemente por qué no se acepta la postulación." />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="outline" className="border-red-600 text-red-700 hover:bg-red-50" disabled={actionLoadingId === application.id || rejectionReason.trim().length < 3} onClick={() => void saveReviewAction(application, 'rejected', rejectionReason)}>Confirmar rechazo</Button>
                      <Button type="button" variant="outline" disabled={actionLoadingId === application.id} onClick={() => { setRejectingApplicationId(null); setRejectionReason('') }}>Cancelar</Button>
                    </div>
                    <p className="text-xs text-neutral-600">Al confirmar, la decisión queda registrada y los documentos se programan para eliminación en 30 días.</p>
                  </div>
                ) : <Button type="button" variant="outline" disabled={actionLoadingId === application.id} onClick={() => { setRejectingApplicationId(application.id); setRejectionReason('') }}>Rechazar</Button>}
              </div>
            </article>
          )
        })}
      </div>}
      {!loading && !error && total > 0 && <AdminPagination page={page} total={total} pageSize={AGENT_APPLICATIONS_PAGE_SIZE} itemLabel="postulaciones" onPageChange={setPage} />}
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm" aria-labelledby="agent-rejection-history-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="agent-rejection-history-title" className="font-semibold text-neutral-900">Historial privado de rechazos</h3>
            <p className="mt-1 text-sm text-neutral-600">Los motivos solo son visibles para moderación autorizada.</p>
          </div>
          <Button type="button" variant="outline" aria-expanded={historyOpen} onClick={toggleRejectionHistory}>
            {historyOpen ? 'Ocultar historial' : 'Ver historial'}
          </Button>
        </div>
        {historyOpen && <div className="mt-4 space-y-3">
          {historyError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{historyError} <button type="button" className="ml-1 font-semibold underline" onClick={() => void loadRejectionHistory(0)}>Reintentar</button></p>}
          {historyLoading && <p role="status" className="text-sm text-neutral-600">Cargando historial...</p>}
          {!historyLoading && !historyError && rejectionEvents.length === 0 && <p className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">No hay rechazos registrados.</p>}
          {rejectionEvents.map((event, index) => <article key={`${event.application_id}-${event.created_at}-${index}`} className="rounded-xl border border-neutral-200 p-3">
            <h4 className="font-semibold text-neutral-900">{event.agent_applications.education_title}</h4>
            <p className="mt-1 text-sm text-neutral-600">{event.agent_applications.province} · Rechazada {formatDate(event.created_at)}</p>
            <p className="mt-2 text-sm text-neutral-800"><span className="font-semibold">Nota interna:</span> {event.reason || 'No se registró un motivo.'}</p>
          </article>)}
          {rejectionEvents.length < historyTotal && <Button type="button" variant="outline" disabled={historyLoading} onClick={() => void loadRejectionHistory(historyPage + 1, true)}>Cargar más historial</Button>}
        </div>}
      </section>
      </section>
    </section>
  )
}

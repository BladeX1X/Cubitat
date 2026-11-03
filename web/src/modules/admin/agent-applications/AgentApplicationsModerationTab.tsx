import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, FileText, RefreshCw, ShieldCheck } from 'lucide-react'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '../components/AdminStates'
import { AdminPagination } from '../components/AdminPagination'
import { Button } from '../../../shared/ui/button'
import { Textarea } from '../../../shared/ui/textarea'
import {
  fetchAgentApplicationDocumentLinks,
  fetchPendingAgentApplications,
  reviewAgentApplication,
  AGENT_APPLICATIONS_PAGE_SIZE,
  type AgentApplicationDocumentLinks,
  type PendingAgentApplication,
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

  if (loading) return <AdminLoadingState message="Cargando postulaciones de agentes..." />
  if (error) return <AdminErrorState message={error} onRetry={() => void load(page)} />
  if (total === 0) {
    return <div className="space-y-3">{actionMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{actionMessage}</p>}<AdminEmptyState title="No hay postulaciones pendientes" message="Las nuevas solicitudes aparecerán aquí para revisión administrativa." /></div>
  }

  return (
    <section aria-labelledby="agent-applications-title" className="space-y-4">
      <header className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#035f53]"><ShieldCheck className="h-4 w-4" /> Revisión con sesión AAL2</p>
          <h2 id="agent-applications-title" className="mt-1 text-lg font-bold text-neutral-900">Postulaciones de agentes</h2>
          <p className="mt-1 text-sm text-neutral-600">Los CV y títulos permanecen privados; sus enlaces expiran en dos minutos.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load(page)}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
      </header>

      {documentError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{documentError}</p>}
      {actionError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
      {actionMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{actionMessage}</p>}
      <div className="space-y-3">
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
      </div>
      <AdminPagination page={page} total={total} pageSize={AGENT_APPLICATIONS_PAGE_SIZE} itemLabel="postulaciones" onPageChange={setPage} />
    </section>
  )
}

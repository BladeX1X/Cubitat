import { useCallback, useEffect, useState } from 'react'
import { BriefcaseBusiness, RefreshCw } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { supabase } from '../../shared/lib/supabaseClient'

type AgentApplicationStatus = 'submitted' | 'reviewing' | 'waitlisted' | 'approved' | 'rejected' | 'withdrawn'

type Props = {
  userId: string
  userRole?: string
  onNavigateAgentApplication?: () => void
  onNavigateAgentDashboard?: () => void
}

const statusCopy: Record<AgentApplicationStatus, { title: string; description: string }> = {
  submitted: { title: 'Postulación recibida', description: 'Recibimos tu solicitud. Te avisaremos cuando comience la revisión.' },
  reviewing: { title: 'Postulación en revisión', description: 'El equipo está revisando tu solicitud.' },
  waitlisted: { title: 'Postulación en lista de espera', description: 'Tu solicitud está en espera de una plaza disponible.' },
  approved: { title: 'Postulación aprobada', description: 'Ya puedes acceder a las herramientas para agentes.' },
  rejected: { title: 'Postulación no aprobada', description: 'Puedes revisar los requisitos y enviar una nueva postulación.' },
  withdrawn: { title: 'Postulación retirada', description: 'Puedes enviar una nueva postulación cuando quieras.' },
}

export function AccountPhaseThreeSection({ userId, userRole, onNavigateAgentApplication, onNavigateAgentDashboard }: Props) {
  const [status, setStatus] = useState<AgentApplicationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadStatus = useCallback(async () => {
    if (!userId) {
      setStatus(null)
      setLoading(false)
      setLoadError(false)
      return
    }
    setLoading(true)
    setLoadError(false)
    try {
      const { data, error } = await supabase
        .from('agent_applications')
        .select('status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        setLoadError(true)
        setStatus(null)
      } else {
        const nextStatus = data?.status
        setStatus(nextStatus && nextStatus in statusCopy ? nextStatus as AgentApplicationStatus : null)
      }
    } catch {
      setLoadError(true)
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  if (userRole === 'agent' || status === 'approved') {
    return (
      <section className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#035f53] text-white"><BriefcaseBusiness size={18} aria-hidden="true" /></span>
          <div><h2 className="text-sm font-bold text-neutral-900">Panel de Agente</h2><p className="text-xs text-neutral-600">Administra tu actividad como agente desde tu cuenta.</p></div>
        </div>
        {onNavigateAgentDashboard ? <Button type="button" className="min-h-11 shrink-0 rounded-full bg-[#035f53] px-5 text-sm font-bold text-white hover:bg-[#024a41]" onClick={onNavigateAgentDashboard}>Ir al Panel de Agente</Button> : null}
      </section>
    )
  }

  if (loading) {
    return <div className="mt-4 min-h-20 animate-pulse rounded-xl border border-neutral-200 bg-neutral-50" aria-label="Consultando estado de postulación" />
  }

  if (loadError) {
    return (
      <section className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center" role="status">
        <p className="text-sm text-amber-950">No pudimos consultar el estado de tu postulación.</p>
        <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => void loadStatus()}><RefreshCw size={16} className="mr-2" />Reintentar</Button>
      </section>
    )
  }

  const applicationCopy = status ? statusCopy[status] : null
  const canApplyAgain = status === null || status === 'rejected' || status === 'withdrawn'

  return (
    <section className={`mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${status ? 'border-sky-200 bg-sky-50/70' : 'border-emerald-200 bg-emerald-50/70'}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#035f53] text-white"><BriefcaseBusiness size={18} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-neutral-900">{applicationCopy?.title ?? '¿Quieres ser agente de Cubitat?'}</h2>
          <p className="text-xs text-neutral-600">{applicationCopy?.description ?? 'Consulta los requisitos y envía tu postulación desde tu cuenta.'}</p>
        </div>
      </div>
      {canApplyAgain && onNavigateAgentApplication ? <Button type="button" className="min-h-11 shrink-0 rounded-full bg-[#035f53] px-5 text-sm font-bold text-white hover:bg-[#024a41]" onClick={onNavigateAgentApplication}>{status ? 'Volver a postularme' : 'Ser agente'}</Button> : null}
    </section>
  )
}

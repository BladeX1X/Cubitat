import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, Loader2, RefreshCw, X } from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'
import { Button } from '../../../shared/ui/button'

type QueueRecord = {
  id: string
  title: string
  category: string
  description: string
  province?: string
  status: string
  createdAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseRows(value: unknown): QueueRecord[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.created_at !== 'string') return []
    const title = item.display_name
    const description = item.description
    const category = item.category
    if (typeof title !== 'string' || typeof category !== 'string' || typeof description !== 'string'
      || typeof item.status !== 'string') return []
    return [{
      id: item.id,
      title,
      category,
      description,
      province: typeof item.province === 'string' ? item.province : undefined,
      status: item.status,
      createdAt: item.created_at,
    }]
  })
}

export function ServiceProviderModerationTab() {
  const [records, setRecords] = useState<QueueRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { data, error: queryError } = await supabase.from('home_service_providers')
        .select('id, display_name, category, description, province, status, created_at')
        .in('status', ['pending_review', 'published'])
        .order('created_at', { ascending: true }).limit(100)
      if (queryError) throw queryError
      setRecords(parseRows(data))
    } catch (loadError) {
      setError(true)
      logSafeEvent({ module: 'admin', action: 'load_phase4_moderation_queue', level: 'error', code: sanitizeErrorReason(loadError) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadQueue() }, [loadQueue])

  async function moderate(record: QueueRecord, action: 'approve' | 'reject' | 'pause') {
    const reason = action === 'reject' || action === 'pause'
      ? window.prompt(`${action === 'reject' ? 'Motivo para rechazar' : 'Motivo para pausar'} (mínimo 5 caracteres):`)?.trim()
      : null
    if ((action === 'reject' || action === 'pause') && (!reason || reason.length < 5)) return

    setPendingId(record.id)
    const { error: moderationError } = await supabase.rpc('moderate_home_service_provider', {
      p_provider_id: record.id,
      p_action: action,
      p_reason: reason,
    })
    if (moderationError) {
      logSafeEvent({ module: 'admin', action: 'moderate_home_service_provider', level: 'error', code: sanitizeErrorReason(moderationError) })
      setError(true)
    }
    await loadQueue()
    setPendingId(null)
  }

  return (
    <section aria-labelledby="phase4-moderation-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="phase4-moderation-title" className="text-lg font-bold text-neutral-900">Revisión de profesionales</h2>
        <p className="mt-1 text-sm text-neutral-600">Aprueba o rechaza perfiles nuevos y pausa perfiles activos. Solo para administradores.</p>
        </div>
        <Button variant="outline" onClick={() => void loadQueue()} disabled={loading} aria-label="Actualizar cola"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Actualizar</Button>
      </div>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>No se pudo cargar o actualizar la cola. Comprueba tu acceso de administrador y que la migración esté aplicada.</span></div>}
      {loading ? <div className="flex items-center justify-center gap-2 py-14 text-sm text-neutral-500"><Loader2 size={19} className="animate-spin" />Cargando solicitudes…</div> : records.length === 0 ? <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center"><p className="font-semibold text-neutral-800">No hay perfiles para revisar</p><p className="mt-1 text-sm text-neutral-500">Las solicitudes y perfiles activos aparecerán aquí.</p></div> : <div className="space-y-4">{records.map((record) => <article key={record.id} className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">Profesional</span><span className="text-xs font-semibold text-neutral-500">{record.category}</span>{record.province && <span className="text-xs text-neutral-500">· {record.province}</span>}<span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600">{record.status === 'pending_review' ? 'Pendiente' : 'Publicado'}</span></div><h3 className="mt-2 text-base font-bold text-neutral-900">{record.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-700">{record.description}</p><p className="mt-3 text-xs text-neutral-500">Recibido {new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(record.createdAt))}</p><div className="mt-4 flex flex-wrap gap-2">{record.status === 'pending_review' ? <><Button type="button" className="min-h-11" disabled={pendingId === record.id} onClick={() => void moderate(record, 'approve')}><Check size={16} className="mr-2" />Aprobar</Button><Button type="button" variant="outline" className="min-h-11 text-red-700" disabled={pendingId === record.id} onClick={() => void moderate(record, 'reject')}><X size={16} className="mr-2" />Rechazar</Button></> : <Button type="button" variant="outline" className="min-h-11 text-amber-800" disabled={pendingId === record.id} onClick={() => void moderate(record, 'pause')}>Pausar perfil</Button>}</div></article>)}</div>}
      <p className="text-xs text-neutral-500">Los perfiles son anuncios comerciales, no certificaciones ni garantías. Cada decisión queda registrada en la bitácora propia del módulo de servicios.</p>
    </section>
  )
}

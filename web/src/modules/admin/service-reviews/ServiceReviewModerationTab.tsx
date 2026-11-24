import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, Loader2, RefreshCw, X } from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'
import { Button } from '../../../shared/ui/button'

type ReviewRecord = {
  id: string
  provider_id: string
  rating: number
  title: string
  body: string
  status: string
  created_at: string
}

type FlagRecord = {
  id: string
  review_id: string
  action: 'report' | 'withdraw'
  reason: string
  status: string
  created_at: string
  review_title: string
  review_body: string
}

function records<T>(value: unknown, required: string[]): T[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is T => typeof item === 'object' && item !== null
    && required.every((key) => typeof (item as Record<string, unknown>)[key] === 'string'))
}

export function ServiceReviewModerationTab() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [flags, setFlags] = useState<FlagRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [reviewResult, flagResult] = await Promise.all([
        supabase.rpc('get_admin_home_service_review_queue'),
        supabase.rpc('get_admin_home_service_review_flags'),
      ])
      if (reviewResult.error) throw reviewResult.error
      if (flagResult.error) throw flagResult.error
      setReviews(records<ReviewRecord>(reviewResult.data, ['id', 'provider_id', 'title', 'body', 'status', 'created_at']))
      setFlags(records<FlagRecord>(flagResult.data, ['id', 'review_id', 'action', 'reason', 'status', 'created_at', 'review_title', 'review_body']))
    } catch (loadError) {
      setError(true)
      logSafeEvent({ module: 'admin', action: 'load_service_review_moderation', level: 'error', code: sanitizeErrorReason(loadError) })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function moderate(review: ReviewRecord, action: 'publish' | 'reject' | 'hide') {
    const reason = action === 'reject' || action === 'hide'
      ? window.prompt('Motivo (mínimo 5 caracteres):')?.trim() : null
    if ((action === 'reject' || action === 'hide') && (!reason || reason.length < 5)) return
    setPendingId(review.id)
    const { error: callError } = await supabase.rpc('moderate_home_service_review', {
      p_review_id: review.id, p_action: action, p_reason: reason,
    })
    if (callError) {
      setError(true)
      logSafeEvent({ module: 'admin', action: 'moderate_service_review', level: 'error', code: sanitizeErrorReason(callError) })
    }
    await load()
    setPendingId(null)
  }

  async function resolveFlag(flag: FlagRecord, action: 'resolve_report' | 'dismiss_report' | 'acknowledge_withdrawal') {
    const reason = window.prompt('Nota de moderación (opcional):')?.trim() || null
    setPendingId(flag.id)
    const { error: callError } = await supabase.rpc('resolve_home_service_review_flag', {
      p_flag_id: flag.id, p_action: action, p_reason: reason,
    })
    if (callError) {
      setError(true)
      logSafeEvent({ module: 'admin', action: 'resolve_service_review_flag', level: 'error', code: sanitizeErrorReason(callError) })
    }
    await load()
    setPendingId(null)
  }

  return (
    <section aria-labelledby="service-reviews-moderation-title" className="space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="service-reviews-moderation-title" className="text-lg font-bold">Moderación de reseñas</h2><p className="mt-1 text-sm text-neutral-600">Solo para administradores. La cola no muestra la identidad del autor o denunciante.</p></div>
        <Button variant="outline" disabled={loading} onClick={() => void load()} aria-label="Actualizar reseñas"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Actualizar</Button>
      </header>
      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle size={18} />No se pudo cargar o actualizar. Comprueba tu acceso de administrador y que la migración esté aplicada.</div>}
      {loading ? <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-500"><Loader2 size={18} className="animate-spin" />Cargando reseñas…</div> : <>
        <section aria-label="Reseñas para moderar" className="space-y-3">
          <h3 className="font-bold">Reseñas activas y pendientes</h3>
          {reviews.length === 0 ? <p className="rounded-xl bg-neutral-50 p-5 text-sm text-neutral-600">No hay reseñas pendientes ni publicadas.</p> : reviews.map((review) => <article key={review.id} className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-amber-50 px-2 py-1 font-bold">{review.rating}/5</span><span className="rounded-full bg-neutral-100 px-2 py-1">{review.status === 'pending_review' ? 'Pendiente' : 'Publicada'}</span><span className="text-neutral-500">{new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(review.created_at))}</span></div><h4 className="mt-2 font-bold">{review.title}</h4><p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-700">{review.body}</p><div className="mt-4 flex flex-wrap gap-2">{review.status === 'pending_review' ? <><Button className="min-h-11" disabled={pendingId === review.id} onClick={() => void moderate(review, 'publish')}><Check size={16} className="mr-2" />Publicar</Button><Button variant="outline" className="min-h-11 text-red-700" disabled={pendingId === review.id} onClick={() => void moderate(review, 'reject')}><X size={16} className="mr-2" />Rechazar</Button></> : <Button variant="outline" className="min-h-11 text-amber-800" disabled={pendingId === review.id} onClick={() => void moderate(review, 'hide')}>Ocultar</Button>}</div></article>)}
        </section>
        <section aria-label="Denuncias pendientes" className="space-y-3">
          <h3 className="font-bold">Denuncias pendientes</h3>
          {flags.length === 0 ? <p className="rounded-xl bg-neutral-50 p-5 text-sm text-neutral-600">No hay denuncias ni solicitudes de retirada pendientes.</p> : flags.map((flag) => <article key={flag.id} className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-xs font-bold uppercase text-amber-800">{flag.action === 'report' ? 'Denuncia privada' : 'Solicitud privada de retirada'}</p><h4 className="mt-2 font-bold">{flag.review_title}</h4><p className="mt-1 text-sm text-neutral-700">{flag.review_body}</p><p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm">Motivo: {flag.reason}</p><div className="mt-3 flex gap-2">{flag.action === 'report' ? <><Button className="min-h-11" disabled={pendingId === flag.id} onClick={() => void resolveFlag(flag, 'resolve_report')}>Resolver</Button><Button variant="outline" className="min-h-11" disabled={pendingId === flag.id} onClick={() => void resolveFlag(flag, 'dismiss_report')}>Descartar denuncia</Button></> : <Button className="min-h-11" disabled={pendingId === flag.id} onClick={() => void resolveFlag(flag, 'acknowledge_withdrawal')}>Cerrar solicitud</Button>}</div></article>)}
        </section>
      </>}
    </section>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, Loader2, RefreshCw, X } from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'
import { Button } from '../../../shared/ui/button'

type MaterialRecord = {
  id: string
  title: string
  category: string
  description: string
  province: string
  status: string
  created_at: string
}

function parseQueue(value: unknown): MaterialRecord[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return []
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string' || typeof row.title !== 'string'
      || typeof row.category !== 'string' || typeof row.description !== 'string'
      || typeof row.province !== 'string' || typeof row.status !== 'string'
      || typeof row.created_at !== 'string') return []
    return [{ id: row.id, title: row.title, category: row.category,
      description: row.description, province: row.province,
      status: row.status, created_at: row.created_at }]
  })
}

export function MaterialModerationTab() {
  const [records, setRecords] = useState<MaterialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { data, error: queryError } = await supabase.rpc('get_admin_material_moderation_queue')
      if (queryError) throw queryError
      setRecords(parseQueue(data))
    } catch (loadError) {
      setError(true)
      logSafeEvent({ module: 'admin', action: 'load_material_moderation_queue', level: 'error', code: sanitizeErrorReason(loadError) })
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function moderate(record: MaterialRecord, action: 'approve' | 'reject' | 'pause') {
    const reason = action === 'reject' || action === 'pause'
      ? window.prompt('Motivo (mínimo 5 caracteres):')?.trim() : null
    if ((action === 'reject' || action === 'pause') && (!reason || reason.length < 5)) return
    setPendingId(record.id)
    const { error: callError } = await supabase.rpc('moderate_material_listing', {
      p_listing_id: record.id, p_action: action, p_reason: reason,
    })
    if (callError) {
      setError(true)
      logSafeEvent({ module: 'admin', action: 'moderate_material_listing', level: 'error', code: sanitizeErrorReason(callError) })
    }
    await load()
    setPendingId(null)
  }

  return (
    <section aria-labelledby="material-moderation-title" className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="material-moderation-title" className="text-lg font-bold">Moderación de materiales</h2><p className="mt-1 text-sm text-neutral-600">Los anuncios pasan por revisión antes de publicarse. Requiere sesión administrativa AAL2.</p></div><Button variant="outline" disabled={loading} onClick={() => void load()} aria-label="Actualizar anuncios"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Actualizar</Button></header>
      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle size={18} />No se pudo cargar o actualizar la cola. Comprueba AAL2 y la migración DEV.</div>}
      {loading ? <div role="status" className="flex items-center justify-center gap-2 py-14 text-sm text-neutral-500"><Loader2 size={18} className="animate-spin" />Cargando anuncios…</div> : records.length === 0 ? <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center"><p className="font-semibold">No hay anuncios para revisar</p></div> : <div className="space-y-4">{records.map((record) => <article key={record.id} className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">Material</span><span className="text-xs font-semibold text-neutral-500">{record.category} · {record.province}</span><span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600">{record.status === 'pending_review' ? 'Pendiente' : 'Publicado'}</span></div><h3 className="mt-2 text-base font-bold">{record.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-700">{record.description}</p><p className="mt-3 text-xs text-neutral-500">Recibido {new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(record.created_at))}</p><div className="mt-4 flex flex-wrap gap-2">{record.status === 'pending_review' ? <><Button className="min-h-11" disabled={pendingId === record.id} onClick={() => void moderate(record, 'approve')}><Check size={16} className="mr-2" />Aprobar</Button><Button variant="outline" className="min-h-11 text-red-700" disabled={pendingId === record.id} onClick={() => void moderate(record, 'reject')}><X size={16} className="mr-2" />Rechazar</Button></> : <Button variant="outline" className="min-h-11 text-amber-800" disabled={pendingId === record.id} onClick={() => void moderate(record, 'pause')}>Pausar anuncio</Button>}</div></article>)}</div>}
      <p className="text-xs text-neutral-500">Precio y disponibilidad son datos declarados por el vendedor, no una reserva ni garantía de inventario. La bitácora conserva cada decisión.</p>
    </section>
  )
}

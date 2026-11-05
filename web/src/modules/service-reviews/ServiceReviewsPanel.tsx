import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { MessageSquareWarning, Star } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import {
  fetchMyServiceReview,
  fetchServiceReviews,
  reportServiceReview,
  requestServiceReviewRemoval,
  submitServiceReview,
  type OwnedServiceReview,
  type ServiceReview,
} from './serviceReviewRepository'

type ServiceReviewsPanelProps = {
  providerId: string
  userId: string | null
  onRequireLogin: () => void
}

const statusLabels: Record<OwnedServiceReview['status'], string> = {
  pending_review: 'En revisión',
  published: 'Publicada',
  rejected: 'No publicada',
  hidden: 'Oculta por moderación',
  withdrawn: 'Retirada',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
}

export function ServiceReviewsPanel({ providerId, userId, onRequireLogin }: ServiceReviewsPanelProps) {
  const [reviews, setReviews] = useState<ServiceReview[]>([])
  const [ownReview, setOwnReview] = useState<OwnedServiceReview | null>(null)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [published, own] = await Promise.all([
        fetchServiceReviews(providerId),
        userId ? fetchMyServiceReview(providerId) : Promise.resolve(null),
      ])
      setReviews(published)
      setOwnReview(own)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [providerId, userId])

  useEffect(() => { void load() }, [load])
  const average = useMemo(() => reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : null, [reviews])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userId) { onRequireLogin(); return }
    setSaving(true)
    setNotice('')
    try {
      await submitServiceReview({ providerId, rating, title, body })
      setTitle('')
      setBody('')
      setNotice('Reseña enviada y pendiente de moderación.')
      await load()
    } catch {
      setNotice('No se pudo enviar. Comprueba si ya tienes una reseña activa para este perfil.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReport(review: ServiceReview) {
    if (!userId) { onRequireLogin(); return }
    const reason = window.prompt('Describe por qué denuncias esta reseña (mínimo 5 caracteres):')?.trim()
    if (!reason || reason.length < 5) return
    setSaving(true)
    try {
      await reportServiceReview(review.id, reason)
      setNotice('Denuncia enviada a revisión privada.')
    } catch { setNotice('No se pudo enviar la denuncia.') }
    finally { setSaving(false) }
  }

  async function withdraw() {
    if (!ownReview || !userId) return
    const reason = window.prompt('Motivo para retirar tu reseña (mínimo 5 caracteres):')?.trim()
    if (!reason || reason.length < 5) return
    setSaving(true)
    try {
      await requestServiceReviewRemoval(ownReview.id, reason)
      setNotice('Reseña retirada; quedó registrada para seguimiento privado.')
      await load()
    } catch { setNotice('No se pudo retirar la reseña.') }
    finally { setSaving(false) }
  }

  return (
    <section aria-labelledby="service-reviews-title" className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">Experiencias de usuarios</p>
          <h2 id="service-reviews-title" className="mt-1 text-2xl font-black text-neutral-900">Reseñas</h2>
        </div>
        {average && <p className="inline-flex items-center gap-1 font-bold text-neutral-800"><Star size={17} className="fill-amber-400 text-amber-500" />{average} · {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}</p>}
      </div>
      <p className="mt-2 text-sm text-neutral-600">Las reseñas son opiniones moderadas. No verifican una contratación ni garantizan resultados.</p>
      {loading ? <p className="mt-6 text-sm text-neutral-500" role="status">Cargando reseñas…</p>
        : error ? <div className="mt-6"><p role="alert" className="text-sm text-red-700">No se pudieron cargar las reseñas.</p><Button className="mt-3" variant="outline" onClick={() => void load()}>Reintentar</Button></div>
          : reviews.length === 0 ? <p className="mt-6 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">Aún no hay reseñas publicadas.</p>
            : <div className="mt-6 space-y-3">{reviews.map((review) => <article key={review.id} className="rounded-2xl border border-neutral-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="inline-flex items-center gap-1 font-bold text-neutral-800"><Star size={15} className="fill-amber-400 text-amber-500" />{review.rating}/5</span><h3 className="font-bold text-neutral-900">{review.title}</h3></div><time className="text-xs text-neutral-500" dateTime={review.createdAt}>{formatDate(review.createdAt)}</time></div><p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-700">{review.body}</p><button type="button" disabled={saving} onClick={() => void handleReport(review)} className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-neutral-600 underline"><MessageSquareWarning size={14} />Denunciar reseña</button></article>)}</div>}
      {userId && ownReview ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-bold">Tu reseña: {statusLabels[ownReview.status]}</p><p className="mt-1 text-sm text-neutral-700">{ownReview.title}</p>{ownReview.status === 'published' && <Button className="mt-3 min-h-11" variant="outline" disabled={saving} onClick={() => void withdraw()}>Solicitar retirada</Button>}</div>
        : <form onSubmit={submit} className="mt-7 space-y-3 border-t border-neutral-200 pt-6"><h3 className="text-lg font-bold text-neutral-900">Comparte tu experiencia</h3><label className="block text-sm font-semibold">Calificación<select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">{[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} de 5</option>)}</select></label><label className="block text-sm font-semibold">Título<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={120} required className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label><label className="block text-sm font-semibold">Reseña<textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={20} maxLength={3000} required rows={4} className="mt-1 block w-full rounded-xl border border-neutral-300 p-3" /></label><Button className="min-h-11" type="submit" disabled={saving}>{saving ? 'Enviando…' : 'Enviar reseña'}</Button></form>}
      {notice && <p role="status" className="mt-4 text-sm text-emerald-800">{notice}</p>}
    </section>
  )
}

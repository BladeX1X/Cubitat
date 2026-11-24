import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'
import { Button } from '../../../shared/ui/button'
import { BUSINESS_BENEFIT_CODES, BUSINESS_BENEFIT_TARGET_TYPES, type BusinessBenefit, type BusinessBenefitCode, type BusinessBenefitTargetType } from '../../../modules/business-benefits/types'
import { isBusinessBenefitActive } from '../../../modules/business-benefits/benefitContracts'
import { fetchBusinessBenefits, grantBusinessBenefit, revokeBusinessBenefit } from '../../../modules/business-benefits/businessBenefitsRepository'

const BENEFIT_LABELS: Record<BusinessBenefitCode, string> = {
  listing_featured: 'Destacado para publicación',
  profile_featured: 'Destacado para perfil',
  priority_contact: 'Contacto prioritario',
  commercial_badge: 'Distintivo comercial',
}
const TARGET_LABELS: Record<BusinessBenefitTargetType, string> = {
  account: 'Cuenta', service_profile: 'Perfil de servicio', material_listing: 'Anuncio de materiales',
}

function toLocalInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function BusinessBenefitsTab() {
  const [records, setRecords] = useState<BusinessBenefit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const [targetType, setTargetType] = useState<BusinessBenefitTargetType>('account')
  const [targetId, setTargetId] = useState('')
  const [benefitCode, setBenefitCode] = useState<BusinessBenefitCode>('commercial_badge')
  const [startsAt, setStartsAt] = useState(() => toLocalInputValue(new Date()))
  const [expiresAt, setExpiresAt] = useState(() => toLocalInputValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)))
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setRecords(await fetchBusinessBenefits())
    } catch (loadError) {
      setError(true)
      logSafeEvent({ module: 'admin', action: 'load_business_benefits', level: 'error', code: sanitizeErrorReason(loadError) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await grantBusinessBenefit({ targetType, targetId, benefitCode, startsAt, expiresAt, reason })
      setReason('')
      await load()
    } catch (grantError) {
      const code = grantError instanceof Error ? grantError.message : 'UNKNOWN'
      setFormError(code.startsWith('INVALID_') ? 'Revisa el UUID, las fechas y el motivo (mínimo 5 caracteres).' : 'No se pudo conceder el beneficio. Comprueba tu acceso de administrador.')
      logSafeEvent({ module: 'admin', action: 'grant_business_benefit', level: 'error', code: sanitizeErrorReason(grantError) })
    } finally {
      setSaving(false)
    }
  }

  async function revoke(record: BusinessBenefit) {
    const reason = window.prompt('Motivo de revocación (mínimo 5 caracteres):')?.trim()
    if (!reason || reason.length < 5) return
    setSaving(true)
    try {
      await revokeBusinessBenefit(record.id, reason)
      await load()
    } catch (revokeError) {
      setError(true)
      logSafeEvent({ module: 'admin', action: 'revoke_business_benefit', level: 'error', code: sanitizeErrorReason(revokeError) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="business-benefits-title" className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="business-benefits-title" className="text-lg font-bold">Beneficios comerciales</h2><p className="mt-1 text-sm text-neutral-600">Concesiones manuales con vigencia y auditoría. No representan pagos. Solo para administradores.</p></div>
        <Button type="button" variant="outline" disabled={loading || saving} onClick={() => void load()} aria-label="Actualizar beneficios"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Actualizar</Button>
      </header>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle size={18} />No se pudo cargar o actualizar. Comprueba tu acceso de administrador y que la migración esté aplicada.</div>}

      <form onSubmit={(event) => void grant(event)} className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:grid-cols-2 sm:p-5">
        <label className="text-sm font-semibold">Tipo de objetivo<select value={targetType} onChange={(event) => setTargetType(event.target.value as BusinessBenefitTargetType)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">{BUSINESS_BENEFIT_TARGET_TYPES.map((type) => <option key={type} value={type}>{TARGET_LABELS[type]}</option>)}</select></label>
        <label className="text-sm font-semibold">UUID de cuenta o publicación<input required value={targetId} onChange={(event) => setTargetId(event.target.value)} autoComplete="off" spellCheck={false} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3 font-mono text-sm" placeholder="UUID" /></label>
        <label className="text-sm font-semibold">Beneficio<select value={benefitCode} onChange={(event) => setBenefitCode(event.target.value as BusinessBenefitCode)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">{BUSINESS_BENEFIT_CODES.map((code) => <option key={code} value={code}>{BENEFIT_LABELS[code]}</option>)}</select></label>
        <label className="text-sm font-semibold">Inicio<input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
        <label className="text-sm font-semibold">Vencimiento<input required type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Motivo<textarea required minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 block min-h-20 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal" /></label>
        {formError && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{formError}</p>}
        <div className="sm:col-span-2"><Button type="submit" disabled={saving} className="min-h-11">{saving ? 'Guardando…' : 'Conceder beneficio'}</Button></div>
      </form>

      {loading ? <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-500"><Loader2 size={18} className="animate-spin" />Cargando beneficios…</div> : records.length === 0 ? <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-7 text-center text-sm text-neutral-600">Todavía no hay beneficios concedidos.</p> : <div className="space-y-3">{records.map((record) => {
        const active = isBusinessBenefitActive(record)
        const status = record.revokedAt ? 'Revocado' : active ? 'Activo' : Date.parse(record.startsAt) > Date.now() ? 'Programado' : 'Vencido'
        return <article key={record.id} className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900">{BENEFIT_LABELS[record.benefitCode]}</span><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">{TARGET_LABELS[record.targetType]}</span><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">{status}</span></div><p className="mt-2 break-all font-mono text-xs text-neutral-600">{record.targetId}</p><p className="mt-2 text-sm text-neutral-700">{record.grantReason}</p><p className="mt-2 text-xs text-neutral-500">Vigencia: {new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.startsAt))} – {new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.expiresAt))}</p>{record.revocationReason && <p className="mt-2 text-xs text-neutral-600">Revocación: {record.revocationReason}</p>}{record.revokedAt === null && <Button type="button" variant="outline" disabled={saving} onClick={() => void revoke(record)} className="mt-3 min-h-11 text-red-700">Revocar</Button>}</article>
      })}</div>}
    </section>
  )
}

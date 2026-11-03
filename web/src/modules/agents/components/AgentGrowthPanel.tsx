import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Copy, Link2, Plus, RefreshCw, Users } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Textarea } from '../../../shared/ui/textarea'
import {
  createAgentLead,
  loadAgentGrowthDashboard,
  updateAgentLeadStatus,
  type AgentGrowthDashboard,
  type AgentLeadKind,
  type AgentLeadStatus,
} from '../agentGrowthRepository'
import { ensureAgentReferralCode, getAgentReferralLink } from '../referrals/agentReferralRepository'

const STATUS_LABELS: Record<AgentLeadStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  converted: 'Convertido',
  lost: 'Cerrado sin avance',
}

const MODULE_LABELS: Partial<Record<AgentGrowthDashboard['failedModules'][number], string>> = {
  leads: 'Oportunidades',
}

export function AgentGrowthPanel() {
  const [data, setData] = useState<AgentGrowthDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [leadType, setLeadType] = useState<AgentLeadKind>('property')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [propertyTitle, setPropertyTitle] = useState('')
  const [location, setLocation] = useState('')
  const [clientInterest, setClientInterest] = useState('')
  const [notes, setNotes] = useState('')
  const [consentConfirmed, setConsentConfirmed] = useState(false)
  const [leadTypeFilter, setLeadTypeFilter] = useState<'all' | AgentLeadKind>('all')
  const [leadStatusFilter, setLeadStatusFilter] = useState<'all' | AgentLeadStatus>('all')
  const [isOpportunityFormOpen, setIsOpportunityFormOpen] = useState(false)
  const [isOpportunityListOpen, setIsOpportunityListOpen] = useState(false)
  const [referralLink, setReferralLink] = useState<string | null>(null)
  const [referralBusy, setReferralBusy] = useState(false)
  const [referralMessage, setReferralMessage] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      setData(await loadAgentGrowthDashboard())
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const visibleLeads = useMemo(() => (data?.leads ?? []).filter((lead) =>
    (leadTypeFilter === 'all' || lead.lead_type === leadTypeFilter)
    && (leadStatusFilter === 'all' || lead.status === leadStatusFilter)), [data?.leads, leadStatusFilter, leadTypeFilter])

  async function handleCreateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setActionError(null)
    setMessage(null)
    try {
      await createAgentLead({
        leadType,
        contactName,
        contactPhone,
        propertyTitle: leadType === 'property' ? propertyTitle : undefined,
        location: leadType === 'property' ? location : undefined,
        clientInterest: leadType === 'client' ? clientInterest : undefined,
        notes,
        consentConfirmed,
      })
      setContactName('')
      setContactPhone('')
      setPropertyTitle('')
      setLocation('')
      setClientInterest('')
      setNotes('')
      setConsentConfirmed(false)
      setMessage('La oportunidad quedó registrada en tu panel.')
      await reload()
    } catch (error) {
      setActionError(error instanceof Error && error.message === 'agent_lead_limit_reached'
        ? 'Has alcanzado el límite de 20 oportunidades en las últimas 24 horas. Podrás registrar otra cuando una salga de ese periodo.'
        : 'No se pudo guardar la oportunidad. Revisa los datos y vuelve a intentar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(leadId: string, status: AgentLeadStatus) {
    setActionError(null)
    try {
      await updateAgentLeadStatus(leadId, status)
      await reload()
    } catch {
      setActionError('No se pudo actualizar el seguimiento de esta oportunidad.')
    }
  }

  async function handleCreateReferralLink() {
    if (referralBusy) return
    setReferralBusy(true)
    setReferralMessage(null)
    try {
      const code = await ensureAgentReferralCode()
      const link = getAgentReferralLink(code)
      if (!link) throw new Error('invalid_referral_link')
      setReferralLink(link)
      setReferralMessage('Tu enlace está listo para compartir.')
    } catch {
      setReferralMessage('No se pudo crear el enlace. Verifica que tu cuenta siga verificada e inténtalo de nuevo.')
    } finally {
      setReferralBusy(false)
    }
  }

  async function handleCopyReferralLink() {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setReferralMessage('Enlace copiado. Las cuentas nuevas que se registren desde él quedarán atribuidas a ti.')
    } catch {
      setReferralMessage('No se pudo copiar automáticamente. Selecciona y copia el enlace mostrado.')
    }
  }

  return (
    <section aria-labelledby="agent-growth-title" className="mt-8 space-y-5">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#035f53]">Captación</p>
        <h2 id="agent-growth-title" className="mt-1 text-xl font-black text-neutral-900">Oportunidades</h2>
        <p className="mt-1 text-sm text-neutral-600">Registra y da seguimiento a propiedades o clientes con autorización de contacto.</p>
      </header>

      {loading ? <div role="status" className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">Cargando tu actividad de captación…</div> : null}
      {!loading && loadError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p>No se pudo cargar tu actividad de captación.</p>
          <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => void reload()}><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button>
        </div>
      ) : null}

      {!loading && !loadError && data?.failedModules.includes('leads') ? (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p>No se pudo cargar: {MODULE_LABELS.leads}{import.meta.env.MODE !== 'production' && data.failureCodes.leads ? ` (código ${data.failureCodes.leads})` : ''}.</p>
          <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => void reload()}><RefreshCw className="mr-2 h-4 w-4" />Reintentar secciones pendientes</Button>
        </div>
      ) : null}

      {!loading && !loadError && data ? <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs font-semibold text-neutral-500">Oportunidades</p><p className="mt-1 text-2xl font-black text-neutral-900">{data.failedModules.includes('leads') ? '—' : data.leads.length}</p></article>
        </div>

        <section aria-labelledby="agent-signup-link-title" className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Link2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#035f53]" />
            <div className="min-w-0 flex-1">
              <h3 id="agent-signup-link-title" className="font-bold text-neutral-900">Invita personas a crear su cuenta</h3>
              <p className="mt-1 text-sm text-neutral-700">El enlace atribuye a tu cuenta los nuevos registros por correo. No registra visitas ni contactos.</p>
              {referralLink ? <label className="mt-3 block text-xs font-semibold text-neutral-700">Tu enlace de registro<input readOnly value={referralLink} onFocus={(event) => event.currentTarget.select()} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm font-normal" /></label> : null}
              {referralMessage ? <p role="status" className="mt-2 text-sm text-neutral-700">{referralMessage}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleCreateReferralLink()} disabled={referralBusy} className="min-h-11 bg-[#035f53] text-white">
                  <Link2 className="mr-2 h-4 w-4" />{referralBusy ? 'Preparando…' : referralLink ? 'Actualizar enlace' : 'Crear mi enlace'}
                </Button>
                {referralLink ? <Button type="button" variant="outline" onClick={() => void handleCopyReferralLink()} className="min-h-11"><Copy className="mr-2 h-4 w-4" />Copiar enlace</Button> : null}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white">
          <button type="button" aria-expanded={isOpportunityFormOpen} aria-controls="agent-opportunity-form" onClick={() => setIsOpportunityFormOpen((open) => !open)} className="flex min-h-14 w-full items-center gap-2 rounded-xl p-4 text-left font-bold text-neutral-900 sm:px-5">
            <Plus className="h-5 w-5 text-[#035f53]" /><span>Registrar una oportunidad</span>
          </button>
          {isOpportunityFormOpen ? <form id="agent-opportunity-form" onSubmit={(event) => void handleCreateLead(event)} className="space-y-4 border-t border-neutral-100 p-4 sm:p-5">
          <label className="block text-sm font-semibold text-neutral-700">Tipo de oportunidad
            <select value={leadType} onChange={(event) => setLeadType(event.target.value as AgentLeadKind)} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm">
              <option value="property">Propiedad captada</option><option value="client">Cliente referido</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-neutral-700">Nombre de contacto<Input required minLength={2} maxLength={120} value={contactName} onChange={(event) => setContactName(event.target.value)} className="mt-1 min-h-11" /></label>
            <label className="text-sm font-semibold text-neutral-700">Teléfono<Input required minLength={6} maxLength={40} type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className="mt-1 min-h-11" /></label>
          </div>
          {leadType === 'property' ? <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-neutral-700">Nombre breve de la propiedad<Input required minLength={3} maxLength={160} value={propertyTitle} onChange={(event) => setPropertyTitle(event.target.value)} className="mt-1 min-h-11" /></label>
            <label className="text-sm font-semibold text-neutral-700">Zona o municipio<Input required minLength={2} maxLength={180} value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1 min-h-11" /></label>
          </div> : <label className="block text-sm font-semibold text-neutral-700">Interés del cliente<Textarea required minLength={3} maxLength={500} value={clientInterest} onChange={(event) => setClientInterest(event.target.value)} className="mt-1 min-h-20" placeholder="Compra, alquiler, permuta u otra necesidad" /></label>}
          <label className="block text-sm font-semibold text-neutral-700">Nota para seguimiento (opcional)<Textarea maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-20" /></label>
          <label className="flex items-start gap-3 text-sm text-neutral-700"><input type="checkbox" required checked={consentConfirmed} onChange={(event) => setConsentConfirmed(event.target.checked)} className="mt-1 h-4 w-4" /><span>Confirmo que esta persona autorizó guardar sus datos y recibir contacto para atender su solicitud.</span></label>
          {actionError ? <p role="alert" className="text-sm text-red-700">{actionError}</p> : null}
          {message ? <p role="status" className="text-sm text-emerald-800">{message}</p> : null}
          <Button type="submit" disabled={saving || !consentConfirmed} className="min-h-11 w-full bg-[#035f53] text-white sm:w-auto"><Users className="mr-2 h-4 w-4" />{saving ? 'Guardando…' : 'Guardar oportunidad'}</Button>
          </form> : null}

        </section>
        <section className="rounded-xl border border-neutral-200 bg-white">
          <button type="button" aria-expanded={isOpportunityListOpen} aria-controls="agent-opportunity-list" onClick={() => setIsOpportunityListOpen((open) => !open)} className="flex min-h-14 w-full items-center rounded-xl p-4 text-left font-bold text-neutral-900 sm:px-5">Propiedades captadas y clientes referidos</button>
          {isOpportunityListOpen ? <article id="agent-opportunity-list" className="border-t border-neutral-100 p-4 sm:p-5">
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-sm font-semibold text-neutral-700">Tipo<select aria-label="Filtrar oportunidades por tipo" value={leadTypeFilter} onChange={(event) => setLeadTypeFilter(event.target.value as 'all' | AgentLeadKind)} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3"><option value="all">Todos</option><option value="property">Propiedades</option><option value="client">Clientes</option></select></label>
            <label className="text-sm font-semibold text-neutral-700">Estado<select aria-label="Filtrar oportunidades por estado" value={leadStatusFilter} onChange={(event) => setLeadStatusFilter(event.target.value as 'all' | AgentLeadStatus)} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3"><option value="all">Todos</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          {data.failedModules.includes('leads') ? <p className="mt-3 text-sm text-amber-900">No se pudieron cargar las oportunidades. Reintenta esa sección.</p> : data.leads.length === 0 ? <p className="mt-3 text-sm text-neutral-600">Aún no registras oportunidades.</p> : visibleLeads.length === 0 ? <p className="mt-3 text-sm text-neutral-600">No hay oportunidades con estos filtros.</p> : <ul className="mt-3 divide-y divide-neutral-100">
            {visibleLeads.map((lead) => <li key={lead.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold text-neutral-900">{lead.lead_type === 'property' ? lead.property_title : lead.contact_name}</p><p className="mt-1 text-sm text-neutral-600">{lead.lead_type === 'property' ? `${lead.contact_name} · ${lead.location}` : lead.client_interest}</p><p className="mt-1 text-xs text-neutral-500">{lead.contact_phone} · {new Date(lead.created_at).toLocaleDateString()}</p>
                <details className="mt-2 text-xs text-neutral-600"><summary className="cursor-pointer font-semibold">Historial de seguimiento</summary><ul className="mt-1 space-y-1">{data.leadEvents.filter((item) => item.lead_id === lead.id).map((item) => <li key={item.id}>{new Date(item.created_at).toLocaleString()} · {item.from_status ? `${STATUS_LABELS[item.from_status]} → ` : ''}{STATUS_LABELS[item.to_status]}{item.note ? ` · ${item.note}` : ''}</li>)}</ul></details>
              </div>
              <label className="text-xs font-semibold text-neutral-600">Estado<select aria-label={`Estado de ${lead.contact_name}`} value={lead.status} onChange={(event) => void handleStatusChange(lead.id, event.target.value as AgentLeadStatus)} disabled={lead.status === 'converted'} className="ml-2 min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-sm">
                {(lead.status === 'new' ? ['new', 'contacted', 'qualified'] : lead.status === 'contacted' ? ['contacted', 'qualified'] : lead.status === 'qualified' ? ['qualified', 'contacted'] : [lead.status]).map((status) => <option key={status} value={status}>{STATUS_LABELS[status as AgentLeadStatus]}</option>)}
              </select></label>
            </li>)}
          </ul>}
          </article> : null}
        </section>

      </> : null}
    </section>
  )
}

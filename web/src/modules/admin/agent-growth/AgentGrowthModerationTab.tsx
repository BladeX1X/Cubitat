import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Textarea } from '../../../shared/ui/textarea'
import {
  addAgentCommission,
  changeAdminLeadStatus,
  changeAgentCommissionStatus,
  loadAgentGrowthOperations,
  type AdminAgentCommission,
  type AdminAgentLead,
} from './agentGrowthRepository'
import type { AgentCommissionStatus, AgentLeadStatus } from '../../agents/agentGrowthRepository'
import type { AgentCommissionEvent, AgentLeadEvent } from '../../agents/agentGrowthRepository'

const LEAD_STATUS_LABELS: Record<AgentLeadStatus, string> = {
  new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado', converted: 'Convertido', lost: 'Cerrado sin avance',
}
const COMMISSION_STATUS_LABELS: Record<AgentCommissionStatus, string> = {
  pending: 'Pendiente', approved: 'Aprobada', paid: 'Registrada como pagada', void: 'Anulada',
}

type CommissionDraft = { reference: string; amount: string; rate: string; currency: 'USD' | 'CUP'; note: string }

export function AgentGrowthModerationTab() {
  const [leads, setLeads] = useState<AdminAgentLead[]>([])
  const [commissions, setCommissions] = useState<AdminAgentCommission[]>([])
  const [leadEvents, setLeadEvents] = useState<AgentLeadEvent[]>([])
  const [commissionEvents, setCommissionEvents] = useState<AgentCommissionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [failedModules, setFailedModules] = useState<Array<'leads' | 'commissions'>>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, CommissionDraft>>({})
  const [leadNotes, setLeadNotes] = useState<Record<string, string>>({})
  const [paymentReferences, setPaymentReferences] = useState<Record<string, string>>({})
  const [commissionNotes, setCommissionNotes] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const data = await loadAgentGrowthOperations()
      setLeads(data.leads)
      setCommissions(data.commissions)
      setLeadEvents(data.leadEvents)
      setCommissionEvents(data.commissionEvents)
      setFailedModules(data.failedModules)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  function updateDraft(leadId: string, key: keyof CommissionDraft, value: string) {
    setDrafts((current) => {
      const draft = current[leadId] || { reference: '', amount: '', rate: '', currency: 'USD', note: '' }
      return {
        ...current,
        [leadId]: {
          ...draft,
          [key]: key === 'currency' ? (value === 'CUP' ? 'CUP' : 'USD') : value,
        } as CommissionDraft,
      }
    })
  }

  async function handleLeadStatus(lead: AdminAgentLead, status: AgentLeadStatus) {
    const note = leadNotes[lead.id] || ''
    const reopeningLostLead = lead.status === 'lost' && status === 'contacted'
    if ((status === 'converted' || status === 'lost' || reopeningLostLead) && note.trim().length < 3) {
      setActionError('Añade el motivo antes de convertir, cerrar o reabrir una oportunidad.')
      return
    }
    setBusyId(lead.id)
    setActionError(null)
    try {
      await changeAdminLeadStatus(lead.id, status, note)
      await reload()
    } catch {
      setActionError('No se pudo actualizar la oportunidad.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCommissionCreate(leadId: string) {
    const draft = drafts[leadId]
    if (!draft || !draft.reference.trim() || !draft.amount || !draft.rate) {
      setActionError('Completa referencia, monto y tasa para calcular la comisión.')
      return
    }
    setBusyId(leadId)
    setActionError(null)
    try {
      await addAgentCommission({
        leadId,
        operationReference: draft.reference,
        eligibleAmount: Number(draft.amount),
        ratePercent: Number(draft.rate),
        currency: draft.currency,
        note: draft.note,
      })
      setDrafts((current) => ({ ...current, [leadId]: { reference: '', amount: '', rate: '', currency: 'USD', note: '' } }))
      await reload()
    } catch {
      setActionError('No se pudo registrar el cálculo. Comprueba que la oportunidad esté convertida y que la referencia no esté duplicada.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCommissionStatus(item: AdminAgentCommission, status: AgentCommissionStatus) {
    const paymentReference = paymentReferences[item.id] || ''
    const note = commissionNotes[item.id] || ''
    if (status === 'paid' && paymentReference.trim().length < 3) {
      setActionError('Añade una referencia de pago para dejar constancia del pago registrado.')
      return
    }
    if (status === 'void' && note.trim().length < 3) {
      setActionError('Añade el motivo para anular este cálculo.')
      return
    }
    setBusyId(item.id)
    setActionError(null)
    try {
      await changeAgentCommissionStatus({ commissionId: item.id, status, paymentReference, note })
      await reload()
    } catch {
      setActionError('No se pudo cambiar el estado de la comisión.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section aria-labelledby="agent-growth-admin-title" className="space-y-6">
      <header><p className="text-xs font-black uppercase tracking-[0.18em] text-[#035f53]">Fase 3</p><h2 id="agent-growth-admin-title" className="mt-1 text-xl font-black text-neutral-900">Captación y comisiones de agentes</h2><p className="mt-1 text-sm text-neutral-600">Acceso protegido por administración AAL2. Los registros de pago son referencias manuales; no se inicia una transferencia.</p></header>
      {actionError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</p> : null}
      {loading ? <p role="status" className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">Cargando operaciones de agentes…</p> : null}
      {!loading && loadError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">No se pudo cargar la actividad de agentes.<Button type="button" variant="outline" className="ml-3 min-h-11" onClick={() => void reload()}><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button></div> : null}
      {!loading && !loadError && failedModules.length > 0 ? <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">No se pudieron cargar estas secciones: {[failedModules.includes('leads') ? 'Oportunidades' : null, failedModules.includes('commissions') ? 'Libro de comisiones' : null].filter(Boolean).join(', ')}. Las demás siguen disponibles.<Button type="button" variant="outline" className="ml-3 min-h-11" onClick={() => void reload()}><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button></div> : null}
      {!loading && !loadError ? <>
        <article className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5"><h3 className="font-bold text-neutral-900">Oportunidades registradas ({failedModules.includes('leads') ? '—' : leads.length})</h3>
          {failedModules.includes('leads') ? <p className="mt-3 text-sm text-amber-900">No se pudieron cargar las oportunidades.</p> : leads.length === 0 ? <p className="mt-3 text-sm text-neutral-600">No hay oportunidades registradas.</p> : <ul className="mt-3 divide-y divide-neutral-100">{leads.map((lead) => <li key={lead.id} className="space-y-3 py-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row"><div><p className="font-semibold text-neutral-900">{lead.lead_type === 'property' ? lead.property_title : lead.contact_name}</p><p className="text-sm text-neutral-600">Agente {lead.agent_id} · {lead.contact_name} · {lead.contact_phone}</p><p className="text-xs text-neutral-500">{lead.lead_type === 'property' ? lead.location : lead.client_interest}</p><details className="mt-2 text-xs text-neutral-600"><summary className="cursor-pointer font-semibold">Historial de seguimiento</summary><ul className="mt-1 space-y-1">{leadEvents.filter((event) => event.lead_id === lead.id).map((event) => <li key={event.id}>{new Date(event.created_at).toLocaleString()} · {event.actor_id || 'Sistema'} · {event.from_status ? `${LEAD_STATUS_LABELS[event.from_status]} → ` : ''}{LEAD_STATUS_LABELS[event.to_status]}{event.note ? ` · ${event.note}` : ''}</li>)}</ul></details></div><span className="text-xs font-bold text-neutral-600">{LEAD_STATUS_LABELS[lead.status]}</span></div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Input aria-label={`Motivo de cambio para ${lead.contact_name}`} maxLength={1000} value={leadNotes[lead.id] || ''} onChange={(event) => setLeadNotes((current) => ({ ...current, [lead.id]: event.target.value }))} placeholder="Motivo de revisión (obligatorio al convertir, cerrar o reabrir)" className="min-h-11" /><select aria-label={`Cambiar estado de ${lead.contact_name}`} value={lead.status} disabled={busyId === lead.id || lead.status === 'converted'} onChange={(event) => void handleLeadStatus(lead, event.target.value as AgentLeadStatus)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm">{(lead.status === 'new' ? ['new', 'contacted', 'qualified', 'lost'] : lead.status === 'contacted' ? ['contacted', 'qualified', 'lost'] : lead.status === 'qualified' ? ['qualified', 'contacted', 'converted', 'lost'] : lead.status === 'lost' ? ['lost', 'contacted'] : ['converted']).map((status) => <option key={status} value={status}>{LEAD_STATUS_LABELS[status as AgentLeadStatus]}</option>)}</select></div>
            {lead.status === 'converted' ? <div className="grid gap-2 rounded-lg bg-neutral-50 p-3 sm:grid-cols-2">
              <Input aria-label="Referencia de operación" maxLength={120} value={drafts[lead.id]?.reference || ''} onChange={(event) => updateDraft(lead.id, 'reference', event.target.value)} placeholder="Referencia de operación" className="min-h-11" />
              <Input aria-label="Monto elegible" type="number" min="0.01" step="0.01" value={drafts[lead.id]?.amount || ''} onChange={(event) => updateDraft(lead.id, 'amount', event.target.value)} placeholder="Monto elegible" className="min-h-11" />
              <Input aria-label="Tasa de comisión porcentual" type="number" min="0.01" max="100" step="0.01" value={drafts[lead.id]?.rate || ''} onChange={(event) => updateDraft(lead.id, 'rate', event.target.value)} placeholder="Tasa %" className="min-h-11" />
              <select aria-label="Moneda de comisión" value={drafts[lead.id]?.currency || 'USD'} onChange={(event) => updateDraft(lead.id, 'currency', event.target.value)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="USD">USD</option><option value="CUP">CUP</option></select>
              <Textarea aria-label="Nota de la comisión" maxLength={1000} value={drafts[lead.id]?.note || ''} onChange={(event) => updateDraft(lead.id, 'note', event.target.value)} placeholder="Nota (opcional)" className="min-h-16 sm:col-span-2" />
              <Button type="button" disabled={busyId === lead.id} className="min-h-11 bg-[#035f53] text-white sm:col-span-2" onClick={() => void handleCommissionCreate(lead.id)}>Registrar cálculo de comisión</Button>
            </div> : null}
          </li>)}</ul>}
        </article>
        <article className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5"><h3 className="font-bold text-neutral-900">Libro de comisiones ({failedModules.includes('commissions') ? '—' : commissions.length})</h3>
          {failedModules.includes('commissions') ? <p className="mt-3 text-sm text-amber-900">No se pudo cargar el libro de comisiones.</p> : commissions.length === 0 ? <p className="mt-3 text-sm text-neutral-600">No hay cálculos registrados. La tasa se introduce para cada operación; no existe una tasa predeterminada.</p> : <ul className="mt-3 divide-y divide-neutral-100">{commissions.map((item) => <li key={item.id} className="space-y-2 py-4"><div className="flex flex-col justify-between gap-2 sm:flex-row"><div><p className="font-semibold text-neutral-900">{item.operation_reference} · Agente {item.agent_id}</p><p className="text-sm text-neutral-700">{Number(item.eligible_amount).toFixed(2)} {item.currency} × {item.rate_percent}% = <strong>{Number(item.commission_amount).toFixed(2)} {item.currency}</strong></p><details className="mt-2 text-xs text-neutral-600"><summary className="cursor-pointer font-semibold">Historial de comisión</summary><ul className="mt-1 space-y-1">{commissionEvents.filter((event) => event.commission_id === item.id).map((event) => <li key={event.id}>{new Date(event.created_at).toLocaleString()} · {event.actor_id || 'Sistema'} · {event.action}{event.note ? ` · ${event.note}` : ''}</li>)}</ul></details></div><span className="text-xs font-bold text-neutral-600">{COMMISSION_STATUS_LABELS[item.status]}</span></div>
            {item.status === 'approved' || item.status === 'pending' ? <div className="space-y-2"><Input aria-label={`Motivo de decisión ${item.operation_reference}`} maxLength={1000} value={commissionNotes[item.id] || ''} onChange={(event) => setCommissionNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Motivo de decisión (obligatorio al anular)" className="min-h-11" /><div className="flex flex-col gap-2 sm:flex-row">{item.status === 'approved' ? <><Input aria-label={`Referencia de pago ${item.operation_reference}`} maxLength={160} value={paymentReferences[item.id] || ''} onChange={(event) => setPaymentReferences((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Referencia del pago confirmado" className="min-h-11" /><Button type="button" disabled={busyId === item.id} className="min-h-11 bg-[#035f53] text-white" onClick={() => void handleCommissionStatus(item, 'paid')}>Registrar pago</Button></> : <Button type="button" disabled={busyId === item.id} className="min-h-11 bg-[#035f53] text-white" onClick={() => void handleCommissionStatus(item, 'approved')}>Aprobar cálculo</Button>}<Button type="button" disabled={busyId === item.id} variant="outline" className="min-h-11" onClick={() => void handleCommissionStatus(item, 'void')}>Anular</Button></div></div> : null}
          </li>)}</ul>}
        </article>
      </> : null}
    </section>
  )
}

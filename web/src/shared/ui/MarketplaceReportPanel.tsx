import { useCallback, useEffect, useId, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import { Button } from './button'
import { TurnstileWidget } from './TurnstileWidget'

type Props = { listingType: 'service' | 'material'; listingId: string; listingTitle: string }

export function MarketplaceReportPanel({ listingType, listingId, listingTitle }: Props) {
  const dialogTitleId = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [token, setToken] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [widgetKey, setWidgetKey] = useState(0)
  const subject = listingType === 'service' ? 'servicio' : 'material'

  const closeDialog = useCallback(() => {
    if (state === 'sending') return
    setOpen(false)
    setReason('')
    setDescription('')
    setToken('')
    setState('idle')
    setWidgetKey((value) => value + 1)
  }, [state])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && state !== 'sending') closeDialog()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeDialog, open, state])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !reason || state === 'sending') return
    setState('sending')
    try {
      const response = await fetch('/api/public/marketplace-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnstile_token: token, listing_type: listingType, listing_id: listingId, reason, description }),
      })
      if (!response.ok) throw new Error('report_failed')
      setState('sent')
    } catch {
      setState('error')
      setToken('')
      setWidgetKey((value) => value + 1)
    }
  }

  return <section className="flex flex-col gap-4 rounded-2xl border border-[#f5ebdb] bg-[#fdfaf2] p-6 md:flex-row md:items-center md:justify-between" aria-labelledby="marketplace-report-title">
    <div>
      <h2 id="marketplace-report-title" className="text-sm font-bold text-neutral-800">Reporta un {subject} sospechoso</h2>
      <p className="mt-1 text-xs text-neutral-600">Si hay algo inusual en este {subject}, infórmanos.</p>
    </div>
    <Button type="button" onClick={() => { setOpen(true); setState('idle') }} className="flex shrink-0 items-center justify-center gap-2 rounded-full border-none bg-[#fcead0] px-5 py-2.5 text-xs font-bold text-neutral-700 transition-colors hover:bg-[#ebd5b8]">
      <AlertTriangle size={14} className="text-amber-600" /> Informar sobre un problema
    </Button>
    {open && <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget && state !== 'sending') closeDialog() }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby={dialogTitleId} className="relative max-h-[min(90vh,760px)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <button type="button" onClick={closeDialog} disabled={state === 'sending'} aria-label="Cerrar" className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-50">
          <X size={20} />
        </button>
        <h2 id={dialogTitleId} className="mb-4 flex items-center gap-2 pr-10 text-base font-bold text-neutral-900">
          <AlertTriangle className="shrink-0 text-amber-500" size={18} />
          Informar sobre un problema
        </h2>

        {state === 'sent' ? (
          <div className="space-y-4 py-4 text-center" role="status">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><CheckCircle2 size={24} /></div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">¡Reporte enviado con éxito!</h3>
              <p className="mt-1 text-sm text-neutral-600">Gracias por ayudarnos a mantener seguro Cubitat. Un moderador revisará el anuncio.</p>
            </div>
            <Button type="button" onClick={closeDialog} className="w-full rounded-full">Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-xs text-neutral-700"><strong>Anuncio:</strong> {listingTitle}</p>
            <label className="grid gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-600">Motivo del reporte
              <select required autoFocus value={reason} onChange={(event) => setReason(event.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs font-normal normal-case tracking-normal focus:border-emerald-500 focus:outline-none">
                <option value="">Selecciona un motivo</option><option value="FRAUD">Fraude o estafa</option><option value="INCORRECT_INFO">Información falsa o desactualizada</option><option value="SPAM">Publicidad o duplicado (spam)</option><option value="OTHER">Otro motivo</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-600">Detalles adicionales
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4} placeholder={`Explica brevemente por qué consideras que este ${subject} tiene un problema…`} className="min-h-[80px] rounded-lg border border-neutral-200 bg-white p-3 text-xs font-normal normal-case tracking-normal focus:border-emerald-500 focus:outline-none" />
            </label>
            <TurnstileWidget key={widgetKey} action="report-marketplace" onVerify={setToken} onExpire={() => setToken('')} onError={() => setToken('')} />
            {state === 'error' && <p role="alert" className="text-sm font-medium text-red-700">No se pudo enviar el reporte. Inténtalo de nuevo.</p>}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} className="h-10 flex-1 rounded-full text-xs font-bold" disabled={state === 'sending'}>Cancelar</Button>
              <Button type="submit" className="h-10 flex-1 rounded-full bg-red-600 text-xs font-bold text-white hover:bg-red-700" disabled={!token || !reason || state === 'sending'}>
                {state === 'sending' ? <><Loader2 size={15} className="mr-2 animate-spin" />Enviando…</> : 'Enviar reporte'}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>}
  </section>
}

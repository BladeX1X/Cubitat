import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Phone, ShieldCheck, X } from 'lucide-react'
import { fetchMarketplaceContact, type MarketplaceContact, type MarketplaceListingType } from '../lib/marketplaceContact'
import { Button } from './button'
import { TurnstileWidget } from './TurnstileWidget'

type MarketplaceContactActionsProps = {
  listingId: string
  listingType: MarketplaceListingType
  label?: string
}

export function MarketplaceContactActions({ listingId, listingType, label = 'Ver contacto' }: MarketplaceContactActionsProps) {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState('')
  const [contact, setContact] = useState<MarketplaceContact | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open || !token || contact) return
    let active = true
    setLoading(true)
    setError(false)
    void fetchMarketplaceContact(listingType, listingId, token)
      .then((result) => { if (active) setContact(result) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [contact, listingId, listingType, open, token])

  const close = () => { setOpen(false); setToken(''); setError(false) }
  const whatsapp = contact?.whatsapp || contact?.phone
  const digits = (value: string) => value.replace(/\D/g, '')

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="min-h-11">
        <ShieldCheck size={17} aria-hidden="true" />{label}
      </Button>
      <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); close() }} className="w-[min(92vw,30rem)] rounded-2xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-neutral-950/50">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 p-5">
          <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Contacto protegido</p><h2 className="mt-1 text-xl font-bold">Contactar anunciante</h2><p className="mt-1 text-sm text-neutral-600">Completa la verificación para ver los datos de contacto.</p></div>
          <button type="button" aria-label="Cerrar" onClick={close} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100"><X size={19} /></button>
        </div>
        <div className="space-y-4 p-5">
          {!contact && <TurnstileWidget action="marketplace-contact" onVerify={setToken} onExpire={() => setToken('')} onError={() => { setToken(''); setError(true) }} />}
          {loading && <p role="status" className="text-sm text-neutral-600">Verificando y consultando el contacto…</p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">No se pudo obtener el contacto. Cierra y vuelve a intentarlo.</p>}
          {contact && <div className="flex flex-wrap gap-2">
            {whatsapp && <a className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white" href={`https://wa.me/${digits(whatsapp)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} />Abrir WhatsApp</a>}
            {contact.phone && <a className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-300 px-4 font-semibold" href={`tel:${contact.phone}`}><Phone size={17} />Llamar</a>}
          </div>}
        </div>
      </dialog>
    </>
  )
}

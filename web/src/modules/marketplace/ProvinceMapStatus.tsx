import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type Props = { error?: boolean; onClose: () => void; resultLabel: string }

export function ProvinceMapStatus({ error = false, onClose, resultLabel }: Props) {
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1021px)').matches)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1021px)')
    const update = () => setDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (desktop) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown) }
  }, [desktop])

  const content = <section className={`z-[9999] flex min-h-0 flex-col bg-white ${desktop ? 'sticky top-4 h-[calc(100dvh-2rem)] rounded-2xl border border-neutral-200' : 'fixed inset-0 h-[100dvh] w-screen pt-[env(safe-area-inset-top)]'}`} role={desktop ? (error ? 'alert' : 'status') : 'dialog'} aria-modal={desktop ? undefined : true} aria-label={`Mapa de ${resultLabel}`}>
    <div className="flex items-center justify-between gap-3 border-b border-neutral-200 p-4">
      <div><p className="font-bold">{error ? 'No se pudo cargar el mapa' : 'Cargando mapa…'}</p>{error && <p className="mt-1 text-sm text-neutral-600">Puedes seguir usando los filtros de provincia.</p>}</div>
      {!desktop && <button type="button" aria-label="Cerrar mapa" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-neutral-200" onClick={onClose}><X size={20} /></button>}
    </div>
    {!desktop && <div className="flex flex-1 items-center justify-center p-6 text-center text-neutral-600">{error ? 'El catálogo sigue disponible. Inténtalo de nuevo más tarde.' : 'Preparando el mapa de provincias…'}</div>}
  </section>

  return content
}

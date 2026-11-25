import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MarketplaceMapCloseAction } from './MarketplaceMapToggle'

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

  const content = <section className={`relative z-[9999] flex min-h-0 flex-col bg-white ${desktop ? 'sticky top-4 h-[calc(100dvh-2rem)] rounded-2xl border border-neutral-200' : 'fixed inset-0 h-[100dvh] w-full pt-[env(safe-area-inset-top)]'}`} role={desktop ? (error ? 'alert' : 'status') : 'dialog'} aria-modal={desktop ? undefined : true} aria-label={`Mapa de ${resultLabel}`}>
    <div className="flex items-center justify-between gap-3 border-b border-neutral-200 p-4">
      <div><p className="font-bold">{error ? 'No se pudo cargar el mapa' : 'Cargando mapa…'}</p>{error && <p className="mt-1 text-sm text-neutral-600">Puedes seguir usando los filtros de provincia.</p>}</div>
    </div>
    {!desktop && <div className="flex flex-1 items-center justify-center p-6 text-center text-neutral-600">{error ? 'El catálogo sigue disponible. Inténtalo de nuevo más tarde.' : 'Preparando el mapa de provincias…'}</div>}
    {!desktop && <MarketplaceMapCloseAction onClose={onClose} />}
  </section>

  return !desktop && typeof document !== 'undefined' ? createPortal(content, document.body) : content
}

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Boxes, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { fetchMyMaterialListings } from '../../modules/materials/materialRepository'
import { MATERIAL_CATEGORY_LABELS, type OwnedMaterialListing } from '../../modules/materials/types'
import { useSEO } from '../../shared/hooks/useSEO'
import { AccountLayout } from '../account/AccountLayout'
import { listMarketplaceDrafts, removeMarketplaceDraft, type MarketplaceDraft } from '../publish/marketplaceDraftStorage'

type MyMaterialListingsPageProps = {
  onBack: () => void
  onCreate: () => void
  onEdit: (listingId: string) => void
  onNavigateAccount: () => void
  onNavigateFavorites: () => void
  onNavigateMyProperties: () => void
  onNavigateMyServices?: () => void
  onNavigateMyMaterials: () => void
  userId: string
  onResumeDraft: (draftId: string) => void
}

const statusLabels: Record<OwnedMaterialListing['status'], string> = {
  pending_review: 'En revisión',
  published: 'Publicado',
  paused: 'Pausado',
  rejected: 'Rechazado',
  archived: 'Archivado',
}

export function MyMaterialListingsPage({
  onBack,
  onCreate,
  onEdit,
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
  onNavigateMyServices,
  onNavigateMyMaterials,
  userId,
  onResumeDraft,
}: MyMaterialListingsPageProps) {
  const [listings, setListings] = useState<OwnedMaterialListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [drafts, setDrafts] = useState<MarketplaceDraft[]>([])
  useSEO({ title: 'Mis anuncios de materiales | Cubitat' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try { setListings(await fetchMyMaterialListings()) }
    catch { setError(true) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => { void listMarketplaceDrafts('material', userId).then(setDrafts).catch(() => setDrafts([])) }, [userId])

  async function deleteDraft(id: string) {
    if (!window.confirm('¿Eliminar este borrador de material?')) return
    try { await removeMarketplaceDraft('material', userId, id); setDrafts(current => current.filter(draft => draft.id !== id)) }
    catch { window.alert('No se pudo eliminar el borrador. Inténtalo de nuevo.') }
  }

  return (
    <AccountLayout
      active="materials"
      onNavigateAccount={onNavigateAccount}
      onNavigateFavorites={onNavigateFavorites}
      onNavigateMyProperties={onNavigateMyProperties}
      onNavigateMyServices={onNavigateMyServices}
      onNavigateMyMaterials={onNavigateMyMaterials}
    >
    <section className="min-h-[70vh] bg-neutral-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-neutral-600 hover:bg-white"><ArrowLeft size={18} />Volver al catálogo</button>
        <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold uppercase text-emerald-800"><Boxes size={17} />Mis publicaciones</p><h1 className="mt-2 text-3xl font-black">Mis anuncios de materiales</h1></div><Button className="min-h-11" onClick={onCreate}>Anunciar material</Button></header>
        {error && <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">No se pudieron cargar tus anuncios. Comprueba la conexión e inténtalo de nuevo.</div>}
        {loading ? <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500"><Loader2 className="animate-spin" size={18} />Cargando anuncios…</div>
          : error && listings.length === 0 ? null
            : listings.length === 0 ? <section className="mt-7 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center"><p className="font-semibold">Todavía no has publicado materiales</p><Button className="mt-4" onClick={onCreate}>Crear anuncio</Button></section>
            : <section aria-label="Tus anuncios" className="mt-7 space-y-3">{listings.map((listing) => <article key={listing.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{listing.title}</h2><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold">{statusLabels[listing.status]}</span></div><p className="mt-1 text-sm text-neutral-600">{MATERIAL_CATEGORY_LABELS[listing.category]} · {[listing.municipality, listing.province].filter(Boolean).join(', ')}</p><p className="mt-2 text-xs text-neutral-500">{listing.status === 'published' ? 'Los cambios volverán a revisión antes de aparecer.' : 'Precio y disponibilidad son informativos.'}</p></div><Button variant="outline" className="min-h-11" disabled={listing.status === 'archived'} onClick={() => onEdit(listing.id)}>Editar</Button></article>)}</section>}
        {drafts.length > 0 && <section aria-label="Borradores de materiales" className="mt-8"><h2 className="text-xl font-bold">Borradores guardados</h2><div className="mt-3 grid gap-3">{drafts.map(draft => { const value = draft.value as Record<string, unknown>; const title = typeof value.title === 'string' && value.title ? value.title : 'Material sin título'; return <article key={draft.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4"><div><h3 className="font-semibold">{title}</h3><p className="text-sm text-neutral-500">Borrador local · Guardado {new Date(draft.updatedAt).toLocaleString()}{typeof value.currency === 'string' ? ` · ${value.currency}` : ''}</p></div><div className="flex gap-2"><Button className="min-h-11" onClick={() => onResumeDraft(draft.id)}>Continuar</Button><Button variant="outline" className="min-h-11" onClick={() => void deleteDraft(draft.id)}>Eliminar</Button></div></article>})}</div></section>}
        {!loading && <Button variant="ghost" className="mt-4 min-h-11" onClick={() => void load()}><RefreshCw size={16} className="mr-2" />Actualizar</Button>}
      </div>
    </section>
    </AccountLayout>
  )
}

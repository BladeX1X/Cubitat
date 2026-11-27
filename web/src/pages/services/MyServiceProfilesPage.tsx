import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, Loader2, Pencil, Plus, RefreshCw } from 'lucide-react'
import { fetchMyHomeServiceProviders } from '../../modules/home-services/homeServiceRepository'
import { HOME_SERVICE_CATEGORY_LABELS, type OwnedHomeServiceProvider } from '../../modules/home-services/types'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'
import { AccountLayout } from '../account/AccountLayout'
import { listMarketplaceDrafts, removeMarketplaceDraft, type MarketplaceDraft } from '../publish/marketplaceDraftStorage'

type MyServiceProfilesPageProps = {
  onBack: () => void
  onCreate: () => void
  onEdit: (providerId: string) => void
  onNavigateAccount: () => void
  onNavigateFavorites: () => void
  onNavigateMyProperties: () => void
  onNavigateMyServices: () => void
  onNavigateMyMaterials?: () => void
  userId: string
  onResumeDraft: (draftId: string) => void
}

const STATUS_LABELS: Record<OwnedHomeServiceProvider['status'], string> = {
  pending_review: 'En revisión',
  published: 'Publicado',
  paused: 'Pausado por moderación',
  rejected: 'Requiere cambios',
}

export function MyServiceProfilesPage({
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
}: MyServiceProfilesPageProps) {
  const [profiles, setProfiles] = useState<OwnedHomeServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [drafts, setDrafts] = useState<MarketplaceDraft[]>([])

  useSEO({ title: 'Mis perfiles de servicios | Cubitat' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setProfiles(await fetchMyHomeServiceProviders())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void listMarketplaceDrafts('service', userId).then(setDrafts).catch(() => setDrafts([])) }, [userId])

  async function deleteDraft(id: string) {
    if (!window.confirm('¿Eliminar este borrador de servicio?')) return
    try { await removeMarketplaceDraft('service', userId, id); setDrafts(current => current.filter(draft => draft.id !== id)) }
    catch { window.alert('No se pudo eliminar el borrador. Inténtalo de nuevo.') }
  }

  return (
    <AccountLayout
      active="services"
      onNavigateAccount={onNavigateAccount}
      onNavigateFavorites={onNavigateFavorites}
      onNavigateMyProperties={onNavigateMyProperties}
      onNavigateMyServices={onNavigateMyServices}
      onNavigateMyMaterials={onNavigateMyMaterials}
    >
    <section className="min-h-[75vh] bg-neutral-50 px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-neutral-600 hover:bg-white"><ArrowLeft size={18} />Directorio</button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800"><BriefcaseBusiness size={17} />Directorio profesional</p><h1 className="mt-2 text-3xl font-black text-neutral-900">Mis perfiles</h1><p className="mt-2 text-sm text-neutral-600">Revisa el estado de tus perfiles y corrige los que requieren cambios.</p></div>
          <Button onClick={onCreate} className="min-h-11"><Plus size={17} className="mr-2" />Crear perfil</Button>
        </div>
        {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">No se pudieron cargar tus perfiles. <button className="ml-2 inline-flex min-h-10 items-center gap-1 font-bold underline" onClick={() => void load()}><RefreshCw size={14} />Reintentar</button></div>}
        {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-neutral-500"><Loader2 className="animate-spin" size={18} />Cargando perfiles…</div>
          : !error && profiles.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center"><p className="font-semibold text-neutral-800">Todavía no tienes perfiles</p><p className="mt-1 text-sm text-neutral-500">Crea uno para que pase a revisión.</p><Button className="mt-4 min-h-11" onClick={onCreate}><Plus size={16} className="mr-2" />Crear perfil</Button></div>
          : <div className="mt-7 grid gap-4">{profiles.map((profile) => <article key={profile.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900">{STATUS_LABELS[profile.status]}</span><h2 className="mt-3 text-lg font-bold text-neutral-900">{profile.displayName}</h2><p className="mt-1 text-sm text-neutral-600">{HOME_SERVICE_CATEGORY_LABELS[profile.category]} · {profile.province}</p><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">{profile.description}</p></div>{profile.status !== 'published' && <Button variant="outline" className="min-h-11 shrink-0" onClick={() => onEdit(profile.id)}><Pencil size={16} className="mr-2" />Editar</Button>}</div></article>)}</div>}
        {drafts.length > 0 && <section aria-label="Borradores de servicios" className="mt-8"><h2 className="text-xl font-bold">Borradores guardados</h2><div className="mt-3 grid gap-3">{drafts.map(draft => { const value = draft.value as Record<string, unknown>; const title = typeof value.displayName === 'string' && value.displayName ? value.displayName : 'Servicio sin título'; return <article key={draft.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4"><div><h3 className="font-semibold">{title}</h3><p className="text-sm text-neutral-500">Borrador local · Guardado {new Date(draft.updatedAt).toLocaleString()}</p></div><div className="flex gap-2"><Button className="min-h-11" onClick={() => onResumeDraft(draft.id)}>Continuar</Button><Button variant="outline" className="min-h-11" onClick={() => void deleteDraft(draft.id)}>Eliminar</Button></div></article>})}</div></section>}
      </div>
    </section>
    </AccountLayout>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Loader2, MapPin, Pencil, RefreshCw } from 'lucide-react'
import { fetchMyHomeServiceProviders } from '../../modules/home-services/homeServiceRepository'
import { HOME_SERVICE_CATEGORY_LABELS, type OwnedHomeServiceProvider } from '../../modules/home-services/types'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'
import { AccountLayout } from '../account/AccountLayout'
import { AccountListingsFrame, type AccountListingFilter } from '../account/AccountListingsFrame'

type MyServiceProfilesPageProps = {
  onCreate: () => void
  onEdit: (providerId: string) => void
  onNavigateAccount: () => void
  onNavigateFavorites: () => void
  onNavigateMyProperties: () => void
  onNavigateMyServices: () => void
  onNavigateMyMaterials?: () => void
  onNavigateAgentDashboard?: () => void
  userRole?: string
}

type ServiceFilter = 'all' | OwnedHomeServiceProvider['status']

const STATUS_LABELS: Record<OwnedHomeServiceProvider['status'], string> = {
  pending_review: 'En revisión',
  published: 'Publicado',
  paused: 'Pausado por moderación',
  rejected: 'Requiere cambios',
}

const STATUS_STYLES: Record<OwnedHomeServiceProvider['status'], string> = {
  pending_review: 'bg-amber-50 text-amber-800',
  published: 'bg-emerald-50 text-emerald-800',
  paused: 'bg-neutral-100 text-neutral-700',
  rejected: 'bg-red-50 text-red-800',
}

const SERVICE_FILTERS: Array<{ id: ServiceFilter; label: string; tone: AccountListingFilter['tone'] }> = [
  { id: 'all', label: 'Todos', tone: 'neutral' },
  { id: 'pending_review', label: 'En revisión', tone: 'amber' },
  { id: 'published', label: 'Publicados', tone: 'green' },
  { id: 'rejected', label: 'Requieren cambios', tone: 'red' },
  { id: 'paused', label: 'Pausados', tone: 'blue' },
]

function ServiceCard({ profile, onEdit }: { profile: OwnedHomeServiceProvider; onEdit: () => void }) {
  const cover = profile.galleryUrls[0]
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-md transition-shadow hover:shadow-lg">
      <div className="relative h-48 shrink-0 overflow-hidden bg-neutral-100">
        {cover ? (
          <img
            src={cover}
            alt={profile.displayName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(event) => { event.currentTarget.style.visibility = 'hidden' }}
          />
        ) : (
          <div className="grid h-full place-items-center bg-emerald-50 text-emerald-800">
            <BriefcaseBusiness size={34} aria-hidden="true" />
            <span className="sr-only">Sin imagen</span>
          </div>
        )}
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[profile.status]}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {STATUS_LABELS[profile.status]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <span className="inline-flex rounded bg-neutral-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-neutral-700">
            {HOME_SERVICE_CATEGORY_LABELS[profile.category]}
          </span>
          <h2 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-neutral-900">{profile.displayName}</h2>
        </div>
        <p className="flex items-start gap-2 text-sm text-neutral-600">
          <MapPin size={16} className="mt-0.5 shrink-0 text-emerald-800" />
          <span>{profile.municipalities.length ? `${profile.municipalities.join(', ')} · ` : ''}{profile.province}</span>
        </p>
        <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-neutral-600">{profile.description}</p>
        <div className="mt-auto border-t border-neutral-100 pt-4">
          {profile.status !== 'published' ? (
            <Button variant="outline" className="min-h-11 w-full" onClick={onEdit}>
              <Pencil size={16} className="mr-2" />Editar
            </Button>
          ) : (
            <p className="min-h-11 content-center text-center text-xs text-neutral-500">Tu perfil está visible en el directorio.</p>
          )}
        </div>
      </div>
    </article>
  )
}

export function MyServiceProfilesPage({
  onCreate,
  onEdit,
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
  onNavigateMyServices,
  onNavigateMyMaterials,
  onNavigateAgentDashboard,
  userRole,
}: MyServiceProfilesPageProps) {
  const [profiles, setProfiles] = useState<OwnedHomeServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ServiceFilter>('all')

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

  const filters = useMemo(() => SERVICE_FILTERS.map((filter) => ({
    ...filter,
    count: filter.id === 'all' ? profiles.length : profiles.filter((profile) => profile.status === filter.id).length,
  })), [profiles])
  const visibleProfiles = statusFilter === 'all' ? profiles : profiles.filter((profile) => profile.status === statusFilter)

  return (
    <AccountLayout
      active="services"
      userRole={userRole}
      onNavigateAccount={onNavigateAccount}
      onNavigateFavorites={onNavigateFavorites}
      onNavigateMyProperties={onNavigateMyProperties}
      onNavigateMyServices={onNavigateMyServices}
      onNavigateMyMaterials={onNavigateMyMaterials}
      onNavigateAgentDashboard={onNavigateAgentDashboard}
    >
      <AccountListingsFrame
        eyebrow="Servicios"
        title="Mis servicios"
        description="Administra, edita y controla los perfiles de servicios que has publicado en la plataforma."
        itemCount={profiles.length}
        itemLabel="perfil"
        itemLabelPlural="perfiles"
        createLabel="Crear perfil"
        onCreate={onCreate}
        secondaryAction={
          <Button variant="ghost" className="min-h-10" onClick={() => void load()}>
            <RefreshCw size={15} className="mr-2" />Actualizar
          </Button>
        }
        filters={filters}
        activeFilter={statusFilter}
        onFilterChange={(filter) => setStatusFilter(filter as ServiceFilter)}
        filterLabel="Filtrar servicios por estado"
      >
        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            No se pudieron cargar tus perfiles.
            <button className="ml-2 inline-flex min-h-10 items-center gap-1 font-bold underline" onClick={() => void load()}>
              <RefreshCw size={14} />Reintentar
            </button>
          </div>
        )}
        {loading ? (
          <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-neutral-500">
            <Loader2 className="animate-spin" size={18} />Cargando perfiles…
          </div>
        ) : !error && profiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-12 text-center">
            <p className="font-semibold text-neutral-800">Todavía no tienes perfiles de servicios</p>
            <p className="mt-1 text-sm text-neutral-500">Crea un perfil para que pase a revisión.</p>
            <Button className="mt-4 min-h-11" onClick={onCreate}>Crear perfil</Button>
          </div>
        ) : !error && visibleProfiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-12 text-center text-sm text-neutral-600">
            No hay perfiles en este estado.
          </div>
        ) : (
          <section aria-label="Tus perfiles" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleProfiles.map((profile) => <ServiceCard key={profile.id} profile={profile} onEdit={() => onEdit(profile.id)} />)}
          </section>
        )}
      </AccountListingsFrame>
    </AccountLayout>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Boxes, Loader2, MapPin, Pencil, RefreshCw } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { fetchMyMaterialListings } from '../../modules/materials/materialRepository'
import { MATERIAL_CATEGORY_LABELS, type OwnedMaterialListing } from '../../modules/materials/types'
import { useSEO } from '../../shared/hooks/useSEO'
import { AccountLayout } from '../account/AccountLayout'
import { AccountListingsFrame, type AccountListingFilter } from '../account/AccountListingsFrame'

type MyMaterialListingsPageProps = {
  onCreate: () => void
  onEdit: (listingId: string) => void
  onNavigateAccount: () => void
  onNavigateFavorites: () => void
  onNavigateMyProperties: () => void
  onNavigateMyServices?: () => void
  onNavigateMyMaterials: () => void
  onNavigateAgentDashboard?: () => void
  userRole?: string
}

type MaterialFilter = 'all' | OwnedMaterialListing['status']

const STATUS_LABELS: Record<OwnedMaterialListing['status'], string> = {
  pending_review: 'En revisión',
  published: 'Publicado',
  paused: 'Pausado',
  rejected: 'Rechazado',
  archived: 'Archivado',
}

const STATUS_STYLES: Record<OwnedMaterialListing['status'], string> = {
  pending_review: 'bg-amber-50 text-amber-800',
  published: 'bg-emerald-50 text-emerald-800',
  paused: 'bg-neutral-100 text-neutral-700',
  rejected: 'bg-red-50 text-red-800',
  archived: 'bg-neutral-100 text-neutral-600',
}

const MATERIAL_FILTERS: Array<{ id: MaterialFilter; label: string; tone: AccountListingFilter['tone'] }> = [
  { id: 'all', label: 'Todos', tone: 'neutral' },
  { id: 'pending_review', label: 'En revisión', tone: 'amber' },
  { id: 'published', label: 'Publicados', tone: 'green' },
  { id: 'rejected', label: 'Rechazados', tone: 'red' },
  { id: 'paused', label: 'Pausados', tone: 'blue' },
  { id: 'archived', label: 'Archivados', tone: 'neutral' },
]

function formatMaterialPrice(listing: OwnedMaterialListing): string {
  if (listing.price == null) return 'Precio no indicado'
  if (listing.currency === 'MIXED') return 'Precio en varias monedas'
  return `${listing.currency} ${listing.price.toLocaleString('es-MX', { maximumFractionDigits: 2 })}`
}

function availabilityLabel(availability: OwnedMaterialListing['availability']): string {
  if (availability === 'limited') return 'Disponibilidad limitada'
  if (availability === 'out_of_stock') return 'Agotado'
  if (availability === 'made_to_order') return 'Por encargo'
  return 'Disponible según anunciante'
}

function MaterialCard({ listing, onEdit }: { listing: OwnedMaterialListing; onEdit: () => void }) {
  const cover = listing.photoUrls[0]
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-md transition-shadow hover:shadow-lg">
      <div className="relative h-48 shrink-0 overflow-hidden bg-neutral-100">
        {cover ? (
          <img
            src={cover}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(event) => { event.currentTarget.style.visibility = 'hidden' }}
          />
        ) : (
          <div className="grid h-full place-items-center bg-emerald-50 text-emerald-800">
            <Boxes size={34} aria-hidden="true" />
            <span className="sr-only">Sin imagen</span>
          </div>
        )}
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[listing.status]}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {STATUS_LABELS[listing.status]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <span className="inline-flex rounded bg-neutral-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-neutral-700">
            {MATERIAL_CATEGORY_LABELS[listing.category]}
          </span>
          <h2 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-neutral-900">{listing.title}</h2>
        </div>
        <p className="flex items-start gap-2 text-sm text-neutral-600">
          <MapPin size={16} className="mt-0.5 shrink-0 text-emerald-800" />{listing.province}
        </p>
        <div>
          <p className="font-bold text-emerald-800">{formatMaterialPrice(listing)}</p>
          <p className="mt-1 text-xs text-neutral-500">{availabilityLabel(listing.availability)}</p>
        </div>
        <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-neutral-600">{listing.description}</p>
        <div className="mt-auto border-t border-neutral-100 pt-4">
          {(
            <Button variant="outline" className="min-h-11 w-full" disabled={listing.status === 'archived'} onClick={onEdit}>
              <Pencil size={16} className="mr-2" />Editar
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

export function MyMaterialListingsPage({
  onCreate,
  onEdit,
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
  onNavigateMyServices,
  onNavigateMyMaterials,
  onNavigateAgentDashboard,
  userRole,
}: MyMaterialListingsPageProps) {
  const [listings, setListings] = useState<OwnedMaterialListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [statusFilter, setStatusFilter] = useState<MaterialFilter>('all')

  useSEO({ title: 'Mis anuncios de materiales | Cubitat' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setListings(await fetchMyMaterialListings())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filters = useMemo(() => MATERIAL_FILTERS.map((filter) => ({
    ...filter,
    count: filter.id === 'all' ? listings.length : listings.filter((listing) => listing.status === filter.id).length,
  })), [listings])
  const visibleListings = statusFilter === 'all' ? listings : listings.filter((listing) => listing.status === statusFilter)

  return (
    <AccountLayout
      active="materials"
      userRole={userRole}
      onNavigateAccount={onNavigateAccount}
      onNavigateFavorites={onNavigateFavorites}
      onNavigateMyProperties={onNavigateMyProperties}
      onNavigateMyServices={onNavigateMyServices}
      onNavigateMyMaterials={onNavigateMyMaterials}
      onNavigateAgentDashboard={onNavigateAgentDashboard}
    >
      <AccountListingsFrame
        eyebrow="Materiales"
        title="Mis materiales"
        description="Administra, edita y controla los anuncios de materiales que has publicado en la plataforma."
        itemCount={listings.length}
        itemLabel="anuncio"
        itemLabelPlural="anuncios"
        createLabel="Anunciar material"
        onCreate={onCreate}
        secondaryAction={
          <Button variant="ghost" className="min-h-10" onClick={() => void load()}>
            <RefreshCw size={15} className="mr-2" />Actualizar
          </Button>
        }
        filters={filters}
        activeFilter={statusFilter}
        onFilterChange={(filter) => setStatusFilter(filter as MaterialFilter)}
        filterLabel="Filtrar materiales por estado"
      >
        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            No se pudieron cargar tus anuncios.
            <button className="ml-2 inline-flex min-h-10 items-center gap-1 font-bold underline" onClick={() => void load()}>
              <RefreshCw size={14} />Reintentar
            </button>
          </div>
        )}
        {loading ? (
          <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-neutral-500">
            <Loader2 className="animate-spin" size={18} />Cargando anuncios…
          </div>
        ) : !error && listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-12 text-center">
            <p className="font-semibold text-neutral-800">Todavía no has publicado materiales</p>
            <p className="mt-1 text-sm text-neutral-500">Crea un anuncio para que pase a revisión.</p>
            <Button className="mt-4 min-h-11" onClick={onCreate}>Anunciar material</Button>
          </div>
        ) : !error && visibleListings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-12 text-center text-sm text-neutral-600">
            No hay anuncios en este estado.
          </div>
        ) : (
          <section aria-label="Tus anuncios" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleListings.map((listing) => <MaterialCard key={listing.id} listing={listing} onEdit={() => onEdit(listing.id)} />)}
          </section>
        )}
      </AccountListingsFrame>
    </AccountLayout>
  )
}

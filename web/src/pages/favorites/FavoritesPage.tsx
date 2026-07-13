import { Button } from '../../shared/ui/button'
import { PropertyCard } from '../../modules/properties/components/PropertyCard'
import { PropertyCardSkeleton } from '../../modules/properties/components/PropertyCardSkeleton'
import { useSavedProperties } from '../../modules/properties/hooks/useSavedProperties'
import type { Property } from '../../modules/properties/types'
import { AccountLayout } from '../account/AccountLayout'
import { useSEO } from '../../shared/hooks/useSEO'

type FavoritesPageProps = {
  properties: Property[]
  onNavigateAccount: () => void
  onNavigateFavorites: () => void
  onNavigateMyProperties: () => void
  onSelectProperty: (propertyId: string) => void
  onGoResults: () => void
}

export function FavoritesPage({
  properties,
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
  onSelectProperty,
  onGoResults,
}: FavoritesPageProps) {
  useSEO({
    title: 'Mis Favoritos',
  })

  const { savedPropertyIds, loading } = useSavedProperties()
  const favoriteProperties = properties.filter((property) =>
    savedPropertyIds.has(property.id),
  )

  return (
    <AccountLayout
      active="favorites"
      onNavigateAccount={onNavigateAccount}
      onNavigateFavorites={onNavigateFavorites}
      onNavigateMyProperties={onNavigateMyProperties}
    >
      <section className="relative overflow-hidden rounded-md bg-gradient-to-r from-[#155b55] to-[#007565] px-7 py-8 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
          Guardados
        </p>
        <h1 className="text-2xl sm:text-[28px] font-black tracking-tight mt-2">
          Favoritos
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base font-semibold text-white/85">
          Revisa las propiedades que guardaste para compararlas con calma.
        </p>
      </section>

      <div className="mt-8">
        <div className="catalog-container bg-white rounded-xl border border-neutral-100 p-5 sm:p-6 shadow-[0_4px_14px_rgba(10,31,28,0.04)]">
          {loading ? (
            <div className="property-catalog-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <PropertyCardSkeleton key={index} />
              ))}
            </div>
          ) : favoriteProperties.length === 0 ? (
            <div className="py-24 px-6 text-center flex flex-col items-center gap-5">
              <svg className="w-28 h-28 mb-2" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="25" cy="30" r="4" fill="#fda4af" className="animate-ping" style={{ animationDuration: '2.5s' }} />
                <circle cx="75" cy="25" r="3" fill="#fecdd3" className="animate-ping" style={{ animationDuration: '3s' }} />
                <circle cx="80" cy="70" r="5" fill="#ffe4e6" className="animate-bounce" style={{ animationDuration: '4s' }} />
                <g className="animate-bounce" style={{ animationDuration: '2.5s' }}>
                  <path d="M50 82C50 82 18 56.402 18 36.5C18 22.969 28.522 12 41.5 12C46.883 12 50 15 50 15C50 15 53.117 12 58.5 12C71.478 12 82 22.969 82 36.5C82 56.402 50 82 50 82Z" 
                        fill="url(#heartGradient)" stroke="#e11d48" strokeWidth="2.5" strokeLinejoin="round" />
                  <circle cx="36" cy="28" r="5" fill="white" opacity="0.3" />
                </g>
                <defs>
                  <linearGradient id="heartGradient" x1="50" y1="12" x2="50" y2="82" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#be123c" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="max-w-sm">
                <h2 className="text-xl font-extrabold text-neutral-900">
                  Todavía no tienes favoritos
                </h2>
                <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                  Guarda propiedades desde los resultados para encontrarlas rápido después.
                </p>
              </div>
              <Button
                className="rounded-full h-10 px-5 text-sm font-bold bg-[#035f53] hover:bg-[#024a41] text-white"
                onClick={onGoResults}
              >
                Buscar propiedades
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
                <p className="text-sm text-neutral-500">
                  <span className="font-bold text-neutral-800">
                    {favoriteProperties.length}
                  </span>{' '}
                  {favoriteProperties.length === 1
                    ? 'propiedad guardada'
                    : 'propiedades guardadas'}
                </p>
                <Button
                  variant="outline"
                  className="rounded-full h-9 px-5 text-xs font-bold"
                  onClick={onGoResults}
                >
                  Ver mas propiedades
                </Button>
              </div>

              <div className="property-catalog-grid">
                {favoriteProperties.map((property, index) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isSelected={false}
                    onSelect={onSelectProperty}
                    prioritizeImage={index < 4}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AccountLayout>
  )
}

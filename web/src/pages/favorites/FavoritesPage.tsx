import { Heart } from 'lucide-react'
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
              <div className="w-24 h-24 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                <Heart className="w-10 h-10" />
              </div>
              <div className="max-w-sm">
                <h2 className="text-xl font-extrabold text-neutral-900">
                  Todavia no tienes favoritos
                </h2>
                <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                  Guarda propiedades desde los resultados para encontrarlas rapido despues.
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

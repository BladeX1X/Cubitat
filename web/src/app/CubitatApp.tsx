import { useMemo, useState } from 'react'
import { PropertyCard } from '../modules/properties/components/PropertyCard'
import { featuredProperties } from '../modules/properties/data/featuredProperties'
import type { Property } from '../modules/properties/types'
import { filterProperties } from '../modules/properties/services/filterProperties'
import { PropertyMap } from '../modules/maps/components/PropertyMap'
import { SearchBar } from '../modules/search/components/SearchBar'
import type { SearchFilters } from '../modules/search/types'

const initialFilters: SearchFilters = {
  query: '',
  operation: 'all',
  propertyType: 'all',
  zoneId: 'all',
}

export function CubitatApp() {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>()

  const visibleProperties = useMemo(
    () => filterProperties(featuredProperties, filters),
    [filters],
  )

  const selectedProperty = visibleProperties.find(
    (property) => property.id === selectedPropertyId,
  )

  function handleSelectZone(zoneId: string) {
    setFilters((current) => ({
      ...current,
      zoneId: current.zoneId === zoneId ? 'all' : zoneId,
    }))
    setSelectedPropertyId(undefined)
  }

  function handleSelectProperty(propertyId: string) {
    setSelectedPropertyId(propertyId)
  }

  function handleClearFilters() {
    setFilters(initialFilters)
    setSelectedPropertyId(undefined)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Cubitat inicio">
          <span className="brand-mark">C</span>
          <span>Cubitat</span>
        </a>
        <SearchBar
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
        />
        <button className="publish-button" type="button">
          Publicar
        </button>
      </header>

      <section className="workspace">
        <aside className="results-panel" aria-label="Resultados de propiedades">
          <div className="results-heading">
            <div>
              <p className="eyebrow">Fase 1 MVP</p>
              <h1>Propiedades en Cuba</h1>
            </div>
            <span className="results-count">{visibleProperties.length}</span>
          </div>

          <p className="results-summary">
            Busqueda mobile-first con mapa desacoplado. Esta pantalla usa datos
            de ejemplo y deja lista la estructura para conectar Supabase.
          </p>

          {selectedProperty ? (
            <SelectedPropertyNotice property={selectedProperty} />
          ) : null}

          <div className="property-list">
            {visibleProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSelected={property.id === selectedPropertyId}
                onSelect={handleSelectProperty}
              />
            ))}
          </div>
        </aside>

        <section className="map-panel" aria-label="Mapa de propiedades">
          <PropertyMap
            properties={visibleProperties}
            selectedZoneId={filters.zoneId}
            selectedPropertyId={selectedPropertyId}
            onSelectZone={handleSelectZone}
            onSelectProperty={handleSelectProperty}
          />
        </section>
      </section>
    </main>
  )
}

function SelectedPropertyNotice({ property }: { property: Property }) {
  return (
    <div className="selected-notice">
      <strong>Seleccionada:</strong> {property.title}
    </div>
  )
}

import { useMemo, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select'
import { cubanMunicipalities, cubanProvinces } from '../../../shared/data/cubaLocations'
import type { LocationSuggestion, SearchFilters } from '../types'

type SearchBarProps = {
  filters: SearchFilters
  locationSuggestions: LocationSuggestion[]
  onChange: (filters: SearchFilters) => void
  onClear: () => void
  onSubmitSearch: () => void
}

const propertyTypeLabels: Record<SearchFilters['propertyType'], string> = {
  all: 'Departamentos',
  casa: 'Casas',
  apartamento: 'Departamentos',
  terreno: 'Terrenos',
}

export function SearchBar({
  filters,
  onChange,
  onClear,
  onSubmitSearch,
}: SearchBarProps) {
  function updateFilter<Key extends keyof SearchFilters>(
    key: Key,
    value: SearchFilters[Key],
  ) {
    onChange({ ...filters, [key]: value })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmitSearch()
  }

  const selectedProvince = useMemo(() => {
    return cubanProvinces.find((province) => filters.query === province || filters.query.endsWith(`, ${province}`)) ?? ''
  }, [filters.query])

  const selectedMunicipality = useMemo(() => {
    if (!selectedProvince) return ''
    const suffix = `, ${selectedProvince}`
    return filters.query.endsWith(suffix) ? filters.query.slice(0, -suffix.length) : ''
  }, [filters.query, selectedProvince])

  const municipalityOptions = selectedProvince ? cubanMunicipalities[selectedProvince] ?? [] : []

  return (
    <form className="hero-search" onSubmit={handleSubmit}>
      <div className="operation-tabs" aria-label="Tipo de operación">
        <Button
          className={filters.operations.includes('alquiler') ? 'is-active' : ''}
          type="button"
          variant="ghost"
          onClick={() => {
            const nextOps = filters.operations.includes('alquiler') ? [] : ['alquiler']
            updateFilter('operations', nextOps as any)
          }}
        >
          Rentar
        </Button>
        <Button
          className={filters.operations.includes('venta') ? 'is-active' : ''}
          type="button"
          variant="ghost"
          onClick={() => {
            const nextOps = filters.operations.includes('venta') ? [] : ['venta']
            updateFilter('operations', nextOps as any)
          }}
        >
          Comprar
        </Button>
        <Button
          className={filters.operations.includes('permuta') ? 'is-active' : ''}
          type="button"
          variant="ghost"
          onClick={() => {
            const nextOps = filters.operations.includes('permuta') ? [] : ['permuta']
            updateFilter('operations', nextOps as any)
          }}
        >
          Permuta
        </Button>
      </div>

      <div className="search-fields">
        <label className="property-type-field">
          <span>Tipo</span>
          <Select
            value={filters.propertyType}
            onValueChange={(value) =>
              updateFilter('propertyType', value as SearchFilters['propertyType'])
            }
          >
            <SelectTrigger
              className="property-type-trigger"
            >
              <SelectValue placeholder="Tipo de inmueble">
                {propertyTypeLabels[filters.propertyType]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="placeholder" disabled>
                Seleccione tipo de propiedad
              </SelectItem>
              <SelectItem value="casa">Casas</SelectItem>
              <SelectItem value="apartamento">Departamentos</SelectItem>
              <SelectItem value="terreno">Terrenos</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <div className="location-select-group">
          <label className="location-select-field">
            <span>Provincia</span>
            <Select
              value={selectedProvince}
              onValueChange={(province) => {
                updateFilter('query', province)
              }}
            >
              <SelectTrigger className="location-select-trigger" aria-label="Provincia">
                <SelectValue placeholder="Selecciona provincia">
                  {selectedProvince}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="location-select-content">
                {cubanProvinces.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="location-select-field">
            <span>Municipio</span>
            <Select
              value={selectedMunicipality}
              onValueChange={(municipality) => {
                updateFilter('query', municipality + ', ' + selectedProvince)
              }}
            >
              <SelectTrigger
                className="location-select-trigger"
                disabled={!selectedProvince}
                aria-label="Municipio"
              >
                <SelectValue placeholder={selectedProvince ? 'Selecciona municipio' : 'Elige provincia'}>
                  {selectedMunicipality}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="location-select-content">
                {municipalityOptions.map((municipality) => (
                  <SelectItem key={municipality} value={municipality}>
                    {municipality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Button className="search-submit" type="submit" aria-label="Buscar">
            <Search size={20} strokeWidth={2.2} />
          </Button>
        </div>
      </div>

      <Button
        className="clear-search"
        type="button"
        variant="ghost"
        onClick={onClear}
      >
        Limpiar búsqueda
      </Button>
    </form>
  )
}

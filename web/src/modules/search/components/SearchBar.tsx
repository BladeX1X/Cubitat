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
import {
  PROPERTY_TYPE_VALUES,
  operationLabels,
  propertyTypeLabels,
  type CanonicalOperation,
} from '../../../shared/lib/propertyTaxonomy'
import type { LocationSuggestion, SearchFilters } from '../types'

type SearchBarProps = {
  filters: SearchFilters
  locationSuggestions: LocationSuggestion[]
  onChange: (filters: SearchFilters) => void
  onClear: () => void
  onSubmitSearch: () => void
}

const SEARCH_OPERATION_VALUES: CanonicalOperation[] = ['alquiler', 'venta', 'permuta']

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
        {SEARCH_OPERATION_VALUES.map((operation) => (
          <Button
            key={operation}
            className={filters.operations.includes(operation) ? 'is-active' : ''}
            type="button"
            variant="ghost"
            onClick={() => {
              const nextOperations: SearchFilters['operations'] = filters.operations.includes(operation)
                ? []
                : [operation]
              updateFilter('operations', nextOperations)
            }}
          >
            {operationLabels[operation].search}
          </Button>
        ))}
      </div>

      <div className="search-fields">
        <div className="property-type-field">
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
                {filters.propertyType === 'all'
                  ? 'Todos los inmuebles'
                  : propertyTypeLabels[filters.propertyType].search}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los inmuebles</SelectItem>
              {PROPERTY_TYPE_VALUES.map((propertyType) => (
                <SelectItem key={propertyType} value={propertyType}>
                  {propertyTypeLabels[propertyType].search}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="location-select-group">
          <label className="location-select-field">
            <span>Provincia</span>
            <Select
              value={selectedProvince}
              onValueChange={(province) => {
                updateFilter('query', province)
              }}
            >
              <SelectTrigger
                className="location-select-trigger"
                aria-label={selectedProvince || 'Selecciona provincia'}
              >
                <SelectValue placeholder="Selecciona provincia">
                  {selectedProvince}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="location-select-content" portal>
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
                aria-label={selectedMunicipality || (selectedProvince ? 'Selecciona municipio' : 'Elige provincia')}
              >
                <SelectValue placeholder={selectedProvince ? 'Selecciona municipio' : 'Elige provincia'}>
                  {selectedMunicipality}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="location-select-content" portal>
                {municipalityOptions.map((municipality) => (
                  <SelectItem key={municipality} value={municipality}>
                    {municipality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Button className="search-submit" type="submit" aria-label="Buscar inmuebles">
            <Search size={20} strokeWidth={2.2} />
            <span>Buscar inmuebles</span>
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

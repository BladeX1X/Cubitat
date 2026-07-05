import type { ChangeEvent, FormEvent } from 'react'
import { Search } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select'
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

  function handleQuery(event: ChangeEvent<HTMLInputElement>) {
    updateFilter('query', event.target.value)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmitSearch()
  }

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
        <div className="location-search-pill">
          <label className="location-field">
            <Input
              id="search-query"
              name="query"
              className="location-search-input"
              aria-label="Buscar propiedades"
              placeholder="¿Dónde quieres buscar?"
              type="search"
              value={filters.query}
              onChange={handleQuery}
            />
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

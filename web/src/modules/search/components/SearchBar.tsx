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
import type { SearchFilters } from '../types'

type SearchBarProps = {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  onClear: () => void
}

const propertyTypeLabels: Record<SearchFilters['propertyType'], string> = {
  all: 'Departamentos',
  casa: 'Casas',
  apartamento: 'Departamentos',
  terreno: 'Terrenos',
}

export function SearchBar({ filters, onChange, onClear }: SearchBarProps) {
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
    document.getElementById('resultados')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <form className="hero-search" onSubmit={handleSubmit}>
      <div className="operation-tabs" aria-label="Tipo de operacion">
        <Button
          className={filters.operation === 'alquiler' ? 'is-active' : ''}
          type="button"
          variant="ghost"
          onClick={() => updateFilter('operation', 'alquiler')}
        >
          Rentar
        </Button>
        <Button
          className={filters.operation === 'venta' ? 'is-active' : ''}
          type="button"
          variant="ghost"
          onClick={() => updateFilter('operation', 'venta')}
        >
          Comprar
        </Button>
        <Button
          className={filters.operation === 'permuta' ? 'is-active' : ''}
          type="button"
          variant="ghost"
          onClick={() => updateFilter('operation', 'permuta')}
        >
          Permuta
        </Button>
        <Button
          className={filters.operation === 'rent-to-own' ? 'is-active' : ''}
          type="button"
          variant="ghost"
          onClick={() => updateFilter('operation', 'rent-to-own')}
        >
          Rent-to-own
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
              aria-label="Tipo de inmueble"
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
              className="location-search-input"
              aria-label="Buscar propiedades"
              placeholder="Donde quieres buscar?"
              type="search"
              value={filters.query}
              onChange={handleQuery}
            />
          </label>
          <Button className="search-submit" type="submit" aria-label="Buscar">
            <Search size={26} strokeWidth={2.2} />
          </Button>
        </div>
      </div>

      <Button
        className="clear-search"
        type="button"
        variant="ghost"
        onClick={onClear}
      >
        Limpiar busqueda
      </Button>
    </form>
  )
}

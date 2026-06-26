import type { ChangeEvent } from 'react'
import type { SearchFilters } from '../types'

type SearchBarProps = {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  onClear: () => void
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

  function handleOperation(event: ChangeEvent<HTMLSelectElement>) {
    updateFilter('operation', event.target.value as SearchFilters['operation'])
  }

  function handlePropertyType(event: ChangeEvent<HTMLSelectElement>) {
    updateFilter(
      'propertyType',
      event.target.value as SearchFilters['propertyType'],
    )
  }

  return (
    <form className="search-bar" onSubmit={(event) => event.preventDefault()}>
      <input
        aria-label="Buscar propiedades"
        placeholder="Buscar zona o inmueble"
        type="search"
        value={filters.query}
        onChange={handleQuery}
      />
      <select
        aria-label="Tipo de operacion"
        value={filters.operation}
        onChange={handleOperation}
      >
        <option value="all">Operacion</option>
        <option value="venta">Venta</option>
        <option value="alquiler">Alquiler</option>
        <option value="permuta">Permuta</option>
        <option value="rent-to-own">Rent-to-own</option>
      </select>
      <select
        aria-label="Tipo de inmueble"
        value={filters.propertyType}
        onChange={handlePropertyType}
      >
        <option value="all">Tipo</option>
        <option value="casa">Casa</option>
        <option value="apartamento">Apartamento</option>
        <option value="terreno">Terreno</option>
      </select>
      <button type="button" onClick={onClear}>
        Limpiar
      </button>
    </form>
  )
}

import { useState, useMemo } from 'react'
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { SearchFilters } from '../types'
import { Button } from '../../../shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../shared/ui/popover'
import { Input } from '../../../shared/ui/input'

export type FilterBarProps = {
  filters: SearchFilters
  isSticky: boolean
  onClearFilters: () => void
  onChangeFilters?: (filters: SearchFilters) => void
  totalResults?: number
}

export function FilterBar({
  filters,
  isSticky,
  onClearFilters,
  onChangeFilters,
  totalResults = 0,
}: FilterBarProps) {
  const [isOperationOpen, setIsOperationOpen] = useState(false)
  const [isTypeOpen, setIsTypeOpen] = useState(false)
  const [isPriceOpen, setIsPriceOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  
  const [minPriceInput, setMinPriceInput] = useState('')
  const [maxPriceInput, setMaxPriceInput] = useState('')

  const isRent = filters.operations.includes('alquiler')
  const isPermuta = filters.operations.includes('permuta')

  // Calculate active extra filters count (bedrooms, bathrooms, parking, priceRange)
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.bedrooms && filters.bedrooms !== 'all') count++
    if (filters.bathrooms && filters.bathrooms !== 'all') count++
    if (filters.parking && filters.parking !== 'all') count++
    if (filters.priceRange && filters.priceRange !== 'all' && !isPermuta) count++
    return count
  }, [filters, isPermuta])

  const handleFilterUpdate = (updatedFields: Partial<SearchFilters>) => {
    if (onChangeFilters) {
      onChangeFilters({
        ...filters,
        ...updatedFields,
      })
    }
  }

  const handleQueryChange = (val: string) => {
    handleFilterUpdate({ query: val })
  }

  const handleOperationToggle = (op: 'venta' | 'alquiler' | 'permuta') => {
    const hasOp = filters.operations.includes(op)
    const nextOps = hasOp ? [] : [op]
    handleFilterUpdate({ operations: nextOps, priceRange: 'all' })
  }

  const handlePropertyTypeSelect = (type: 'casa' | 'apartamento' | 'terreno') => {
    const newType = filters.propertyType === type ? 'all' : type
    handleFilterUpdate({ propertyType: newType })
  }

  const handlePriceRangeSelect = (range: string) => {
    const newRange = filters.priceRange === range ? 'all' : range
    handleFilterUpdate({ priceRange: newRange })
    // Clear inputs when selecting pre-defined range
    setMinPriceInput('')
    setMaxPriceInput('')
  }

  // Get human readable labels
  const operationLabel = (() => {
    if (filters.operations.length === 0) return 'Operación'
    const labels = filters.operations.map(op => op === 'alquiler' ? 'Renta' : op === 'venta' ? 'Venta' : 'Permuta')
    return labels.join(' + ')
  })()

  const typeLabel = (() => {
    if (filters.propertyType === 'casa') return 'Casas'
    if (filters.propertyType === 'apartamento') return 'Departamentos'
    if (filters.propertyType === 'terreno') return 'Terrenos'
    return 'Inmueble'
  })()

  const priceLabel = (() => {
    if (!filters.priceRange || filters.priceRange === 'all') return 'Precio'
    
    if (isRent) {
      if (filters.priceRange === '0-200') return 'Hasta $200'
      if (filters.priceRange === '200-500') return '$200 - $500'
      if (filters.priceRange === '500-1000') return '$500 - $1000'
      if (filters.priceRange === '1000-') return 'Más de $1000'
    } else {
      if (filters.priceRange === '0-50000') return 'Hasta $50k'
      if (filters.priceRange === '50000-100000') return '$50k - $100k'
      if (filters.priceRange === '100000-200000') return '$100k - $200k'
      if (filters.priceRange === '200000-') return 'Más de $200k'
    }

    // Custom label parsing: "min-max"
    const [minStr, maxStr] = filters.priceRange.split('-')
    const minVal = minStr ? Number(minStr) : 0
    const maxVal = maxStr ? Number(maxStr) : null

    if (minVal > 0 && maxVal) {
      return `$${minVal} - $${maxVal}`
    }
    if (minVal > 0) {
      return `Más de $${minVal}`
    }
    if (maxVal) {
      return `Hasta $${maxVal}`
    }
    return 'Precio'
  })()

  return (
    <div
      className={`results-toolbar-full border-b border-neutral-100 bg-white py-3 px-4 flex flex-wrap items-center gap-3 ${
        isSticky ? 'is-sticky shadow-sm' : ''
      }`}
      aria-label="Filtros activos"
    >
      {/* 1. Selector de Lugares / Búsqueda */}
      <div className="flex items-center border border-neutral-300 rounded-md px-3 py-1 bg-white min-w-[200px] max-w-[300px] h-10 shadow-sm focus-within:border-[#035f53] transition-colors relative">
        <input
          type="text"
          placeholder="Buscar zona..."
          className="w-full text-sm outline-none text-neutral-800 placeholder-neutral-400 pr-6"
          value={filters.query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        {filters.query ? (
          <button
            type="button"
            onClick={() => handleQueryChange('')}
            className="absolute right-2.5 text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X size={14} className="stroke-[2.5px]" />
          </button>
        ) : null}
      </div>

      {/* 2. Selector de Operación (Venta / Renta / Permuta) */}
      <Popover open={isOperationOpen} onOpenChange={setIsOperationOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={`flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-semibold transition-all ${
              filters.operations.length > 0
                ? 'border-[#035f53] text-[#035f53] bg-[#035f53]/5 hover:bg-[#035f53]/10'
                : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <span>{operationLabel}</span>
            {isOperationOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-48 p-2 flex flex-col gap-1 bg-white border border-neutral-200 shadow-lg rounded-md">
          <div className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 rounded-md text-sm font-medium text-neutral-700 cursor-pointer"
               onClick={() => { handleOperationToggle('venta'); setIsOperationOpen(false) }}>
            <input
              type="radio"
              id="op-venta"
              name="operation"
              checked={filters.operations.includes('venta')}
              onChange={() => {}}
              className="h-4 w-4 border-neutral-300 text-[#035f53] focus:ring-[#035f53] focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="op-venta" className="cursor-pointer select-none flex-1 py-1">Venta</label>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 rounded-md text-sm font-medium text-neutral-700 cursor-pointer"
               onClick={() => { handleOperationToggle('alquiler'); setIsOperationOpen(false) }}>
            <input
              type="radio"
              id="op-renta"
              name="operation"
              checked={filters.operations.includes('alquiler')}
              onChange={() => {}}
              className="h-4 w-4 border-neutral-300 text-[#035f53] focus:ring-[#035f53] focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="op-renta" className="cursor-pointer select-none flex-1 py-1">Renta</label>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 rounded-md text-sm font-medium text-neutral-700 cursor-pointer"
               onClick={() => { handleOperationToggle('permuta'); setIsOperationOpen(false) }}>
            <input
              type="radio"
              id="op-permuta"
              name="operation"
              checked={filters.operations.includes('permuta')}
              onChange={() => {}}
              className="h-4 w-4 border-neutral-300 text-[#035f53] focus:ring-[#035f53] focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="op-permuta" className="cursor-pointer select-none flex-1 py-1">Permuta</label>
          </div>
        </PopoverContent>
      </Popover>

      {/* 3. Selector de Tipo de Inmueble */}
      <Popover open={isTypeOpen} onOpenChange={setIsTypeOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={`flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-semibold transition-all ${
              filters.propertyType !== 'all'
                ? 'border-[#035f53] text-[#035f53] bg-[#035f53]/5 hover:bg-[#035f53]/10'
                : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <span>{typeLabel}</span>
            {isTypeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-2 flex flex-col gap-1 bg-white border border-neutral-200 shadow-lg rounded-md">
          {(['casa', 'apartamento', 'terreno'] as const).map((type) => (
            <div
              key={type}
              className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 rounded-md text-sm font-medium text-neutral-700"
            >
              <input
                type="checkbox"
                id={`type-${type}`}
                checked={filters.propertyType === type}
                onChange={() => handlePropertyTypeSelect(type)}
                className="h-4 w-4 rounded border-neutral-300 text-[#035f53] focus:ring-[#035f53] focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor={`type-${type}`} className="cursor-pointer select-none flex-1 py-1 capitalize">
                {type === 'apartamento' ? 'Departamento' : type}s
              </label>
            </div>
          ))}
        </PopoverContent>
      </Popover>

      {/* 4. Selector de Precio con Rango Personalizado */}
      {!isPermuta && (
        <Popover open={isPriceOpen} onOpenChange={setIsPriceOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={`flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-semibold transition-all ${
                filters.priceRange && filters.priceRange !== 'all'
                  ? 'border-[#035f53] text-[#035f53] bg-[#035f53]/5 hover:bg-[#035f53]/10'
                  : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span>{priceLabel}</span>
              {isPriceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3 flex flex-col gap-2 bg-white border border-neutral-200 shadow-lg rounded-md">
            <div className="flex flex-col gap-1">
              {(isRent
                ? [
                    { label: 'Hasta $200', value: '0-200' },
                    { label: '$200 - $500', value: '200-500' },
                    { label: '$500 - $1000', value: '500-1000' },
                    { label: 'Más de $1000', value: '1000-' },
                  ]
                : [
                    { label: 'Hasta $50k', value: '0-50000' },
                    { label: '$50k - $100k', value: '50000-100000' },
                    { label: '$100k - $200k', value: '100000-200000' },
                    { label: 'Más de $200k', value: '200000-' },
                  ]
              ).map((item, idx) => (
                <div
                  key={item.value}
                  className="flex items-center gap-3 px-3 py-1.5 hover:bg-neutral-50 rounded-md text-sm font-medium text-neutral-700"
                >
                  <input
                    type="checkbox"
                    id={`price-pre-${idx}`}
                    checked={filters.priceRange === item.value}
                    onChange={() => handlePriceRangeSelect(item.value)}
                    className="h-4 w-4 rounded border-neutral-300 text-[#035f53] focus:ring-[#035f53] focus:ring-offset-0 cursor-pointer"
                  />
                  <label htmlFor={`price-pre-${idx}`} className="cursor-pointer select-none flex-1 py-1">
                    {item.label}
                  </label>
                </div>
              ))}
            </div>

          <hr className="border-neutral-100 my-1" />

          {/* Rango Personalizado */}
          <div className="flex flex-col gap-2 p-1">
            <span className="text-xs font-bold text-neutral-500">Rango personalizado</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Mínimo"
                className="h-8 text-xs w-full border border-neutral-300"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
              />
              <span className="text-neutral-400 text-xs">-</span>
              <Input
                type="number"
                placeholder="Máximo"
                className="h-8 text-xs w-full border border-neutral-300"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const min = minPriceInput.trim()
                const max = maxPriceInput.trim()
                if (min || max) {
                  handleFilterUpdate({ priceRange: `${min}-${max}` })
                  setIsPriceOpen(false)
                }
              }}
              className="bg-[#035f53] text-white hover:bg-[#024a41] h-8 text-xs font-bold w-full mt-1"
            >
              Aplicar rango
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    )}

      {/* 5. Botón de Más Filtros ("Filtros") */}
      <Popover open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 h-10 px-4 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-sm font-semibold transition-all"
          >
            {activeFiltersCount > 0 ? (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#035f53] text-white text-xs font-bold">
                {activeFiltersCount}
              </span>
            ) : null}
            <span>Filtros</span>
            <Filter size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-5 bg-white border border-neutral-200 shadow-2xl rounded-lg flex flex-col gap-5">
          {/* Segmento Recámaras */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-neutral-800">Recámaras</span>
            <div className="flex border border-neutral-200 rounded-md overflow-hidden bg-neutral-50">
              {['all', 1, 2, 3, 4].map((num) => {
                const isActive = (filters.bedrooms ?? 'all') === num
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleFilterUpdate({ bedrooms: num === 'all' ? 'all' : Number(num) })}
                    className={`flex-1 py-2 text-center text-xs font-semibold border-r border-neutral-200 last:border-r-0 transition-all ${
                      isActive
                        ? 'bg-[#035f53] text-white'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {num === 'all' ? 'Todos' : num}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Segmento Baños */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-neutral-800">Baños</span>
            <div className="flex border border-neutral-200 rounded-md overflow-hidden bg-neutral-50">
              {['all', 1, 2, 3, 4].map((num) => {
                const isActive = (filters.bathrooms ?? 'all') === num
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleFilterUpdate({ bathrooms: num === 'all' ? 'all' : Number(num) })}
                    className={`flex-1 py-2 text-center text-xs font-semibold border-r border-neutral-200 last:border-r-0 transition-all ${
                      isActive
                        ? 'bg-[#035f53] text-white'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {num === 'all' ? 'Todos' : num}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Segmento Estacionamientos */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-neutral-800">Estacionamientos</span>
            <div className="flex border border-neutral-200 rounded-md overflow-hidden bg-neutral-50">
              {['all', 1, 2, 3, 4].map((num) => {
                const isActive = (filters.parking ?? 'all') === num
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleFilterUpdate({ parking: num === 'all' ? 'all' : Number(num) })}
                    className={`flex-1 py-2 text-center text-xs font-semibold border-r border-neutral-200 last:border-r-0 transition-all ${
                      isActive
                        ? 'bg-[#035f53] text-white'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {num === 'all' ? 'Todos' : num}
                  </button>
                )
              })}
            </div>
          </div>

          <hr className="border-neutral-100 my-1" />

          {/* Footer Popover */}
          <div className="flex justify-between items-center gap-4">
            <button
              type="button"
              onClick={() => {
                onClearFilters()
                setIsMoreOpen(false)
              }}
              className="text-xs font-bold text-[#035f53] hover:underline cursor-pointer"
            >
              Limpiar filtros
            </button>
            <Button
              type="button"
              onClick={() => setIsMoreOpen(false)}
              className="bg-[#035f53] text-white hover:bg-[#024a41] rounded-full px-5 py-2 text-xs font-bold"
            >
              Ver {totalResults} resultados
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

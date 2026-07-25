import { useState } from 'react'
import { BellPlus, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { SearchFilters } from '../types'
import {
  getActiveExtraFiltersCount,
  getOperationLabel,
  getPriceLabel,
  getPropertyTypeLabel,
  parkingOptions,
  propertyTypeOptions,
  purchasePriceOptions,
  rentPriceOptions,
  segmentOptions,
} from '../lib/filterOptions'
import { useMobileFilterSheet } from '../hooks/useMobileFilterSheet'
import { Button } from '../../../shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../shared/ui/popover'
import { Input } from '../../../shared/ui/input'
import { PHASE_TWO_ENABLED } from '../../../shared/config/features'

export type FilterBarProps = {
  filters: SearchFilters
  isSticky: boolean
  onClearFilters: () => void
  onChangeFilters?: (filters: SearchFilters) => void
  totalResults?: number
  onCreateAlert?: () => void
  creatingAlert?: boolean
  alertMessage?: string | null
  alertError?: string | null
}

export function FilterBar({
  filters,
  isSticky,
  onClearFilters,
  onChangeFilters,
  totalResults = 0,
  onCreateAlert,
  creatingAlert = false,
  alertMessage: _alertMessage,
  alertError: _alertError,
}: FilterBarProps) {
  const [isOperationOpen, setIsOperationOpen] = useState(false)
  const [isTypeOpen, setIsTypeOpen] = useState(false)
  const [isPriceOpen, setIsPriceOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [minPriceInput, setMinPriceInput] = useState('')
  const [maxPriceInput, setMaxPriceInput] = useState('')

  const isRent = filters.operations.includes('alquiler')
  const isPermuta = filters.operations.includes('permuta')
  const {
    isMobileViewport,
    isMounted: isMobileSheetMounted,
    isVisible: isMobileSheetVisible,
    close: closeMobileFilterSheet,
  } = useMobileFilterSheet(isMoreOpen, setIsMoreOpen)
  const activeFiltersCount = getActiveExtraFiltersCount(filters)
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

  const handleSegmentUpdate = (
    field: 'bedrooms' | 'bathrooms' | 'parking',
    value: 'all' | number,
  ) => {
    handleFilterUpdate({ [field]: value } as Partial<SearchFilters>)
  }

  const handleCustomPriceApply = () => {
    const min = minPriceInput.trim()
    const max = maxPriceInput.trim()
    if (min || max) {
      handleFilterUpdate({ priceRange: `${min}-${max}` })
      setIsPriceOpen(false)
      if (isMobileViewport) {
        closeMobileFilterSheet()
      }
    }
  }


  const operationLabel = getOperationLabel(filters)
  const typeLabel = getPropertyTypeLabel(filters)
  const priceLabel = getPriceLabel(filters)
  const activePriceOptions = isRent ? rentPriceOptions : purchasePriceOptions

  const mobileSummaryParts = [
    operationLabel === 'Operación' ? 'Operación' : operationLabel,
    typeLabel,
    priceLabel === 'Precio' ? null : priceLabel,
  ].filter(Boolean)

  return (
    <>
      <div className="mobile-results-summary-card" aria-label="Resumen de busqueda">
        <div>
          <strong>{filters.query || 'Cuba'}</strong>
          <span>{mobileSummaryParts.join(' · ')}</span>
        </div>
        <small>{totalResults} inmuebles</small>
      </div>

      <div
        className={`results-toolbar-full border-b border-neutral-100 bg-white py-3 px-4 flex flex-wrap items-center gap-3 ${
          isSticky ? 'is-sticky shadow-sm' : ''
        }`}
        aria-label="Filtros activos"
      >
      {/* 1. Selector de Lugares / Búsqueda */}
      <div className="filter-search-field flex items-center border border-neutral-300 rounded-md px-3 py-1 bg-white min-w-[200px] max-w-[300px] h-10 shadow-sm focus-within:border-[#035f53] transition-colors relative">
        <input
          id="filter-search-query"
          name="filter-query"
          type="text"
          placeholder="Buscar zona..."
          aria-label="Buscar zona"
          className="w-full text-sm outline-none text-neutral-800 placeholder-neutral-400 pr-6"
          value={filters.query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        {filters.query ? (
          <button
            type="button"
            onClick={() => handleQueryChange('')}
            className="filter-search-clear absolute right-0 text-neutral-400 hover:text-neutral-900 transition-colors"
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
            className={`filter-control flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-semibold transition-all ${
              filters.operations.length > 0
                ? 'border-[#035f53] text-[#035f53] bg-[#035f53]/5 hover:bg-[#035f53]/10'
                : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <span>{operationLabel}</span>
            {isOperationOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" sideOffset={8} avoidCollisions={false} className="w-48 p-2 flex flex-col gap-1 bg-white border border-neutral-200 shadow-lg rounded-md">
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
            className={`filter-control flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-semibold transition-all ${
              filters.propertyType !== 'all'
                ? 'border-[#035f53] text-[#035f53] bg-[#035f53]/5 hover:bg-[#035f53]/10'
                : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <span>{typeLabel}</span>
            {isTypeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" sideOffset={8} avoidCollisions={false} className="w-52 p-2 flex flex-col gap-1 bg-white border border-neutral-200 shadow-lg rounded-md">
          {propertyTypeOptions.map((type) => (
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
              className={`filter-control flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-semibold transition-all ${
                filters.priceRange && filters.priceRange !== 'all'
                  ? 'border-[#035f53] text-[#035f53] bg-[#035f53]/5 hover:bg-[#035f53]/10'
                  : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span>{priceLabel}</span>
              {isPriceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" sideOffset={8} avoidCollisions={false} className="w-64 p-3 flex flex-col gap-2 bg-white border border-neutral-200 shadow-lg rounded-md">
            <div className="flex flex-col gap-1">
              {(isRent ? rentPriceOptions : purchasePriceOptions).map((item, idx) => (
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
                id="custom-min-price"
                name="min-price"
                type="number"
                placeholder="Mínimo"
                className="h-8 text-xs w-full border border-neutral-300"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
              />
              <span className="text-neutral-400 text-xs">-</span>
              <Input
                id="custom-max-price"
                name="max-price"
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
              onClick={handleCustomPriceApply}
              className="bg-[#035f53] text-white hover:bg-[#024a41] h-8 text-xs font-bold w-full mt-1"
            >
              Aplicar rango
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    )}

      {PHASE_TWO_ENABLED && (
        <Button
          type="button"
          variant="outline"
          onClick={() => handleFilterUpdate({ verifiedOnly: !filters.verifiedOnly })}
          className={`filter-control flex items-center gap-1.5 h-10 px-4 rounded-md border text-sm font-semibold transition-all ${
            filters.verifiedOnly
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
              : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          <span>🛡️ Solo Verificados</span>
        </Button>
      )}

      {/* 5. Botón de Más Filtros ("Filtros") */}
      <Popover open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="filter-control filter-more-control flex items-center gap-2 h-10 px-4 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-sm font-semibold transition-all"
          >
            {activeFiltersCount > 0 ? (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#035f53] text-white text-xs font-bold">
                {activeFiltersCount}
              </span>
            ) : null}
            <span>Filtros</span>
            <SlidersHorizontal size={14} />
          </Button>
        </PopoverTrigger>
        {!isMobileViewport ? (
        <PopoverContent side="bottom" align="end" sideOffset={8} avoidCollisions={false} className="w-80 p-5 bg-white border border-neutral-200 shadow-2xl rounded-lg flex flex-col gap-5">
          {/* Segmento Recámaras */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-neutral-800">Recámaras</span>
            <div className="flex border border-neutral-200 rounded-md overflow-hidden bg-neutral-50">
              {segmentOptions.map((num) => {
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
              {segmentOptions.map((num) => {
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
              {segmentOptions.map((num) => {
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

          {PHASE_TWO_ENABLED && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-neutral-800">Reputación y Confianza</span>
              <div
                className="flex items-center gap-3 px-3 py-2 bg-neutral-50 hover:bg-neutral-100 rounded-md text-sm font-medium text-neutral-700 cursor-pointer"
                onClick={() => handleFilterUpdate({ minTrustScore: filters.minTrustScore === 4.0 ? 'all' : 4.0 })}
              >
                <input
                  type="checkbox"
                  id="filter-trust-score"
                  checked={filters.minTrustScore === 4.0}
                  onChange={() => {}}
                  className="h-4 w-4 rounded border-neutral-300 text-[#035f53] focus:ring-[#035f53]"
                />
                <label htmlFor="filter-trust-score" className="cursor-pointer select-none text-xs font-semibold">
                  ⭐ Reputación Alta (Trust Score ≥ 4.0)
                </label>
              </div>
            </div>
          )}

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
        ) : null}
      </Popover>
      {onCreateAlert ? (
        <Button
          type="button"
          variant="outline"
          className="filter-alert-control"
          onClick={onCreateAlert}
          disabled={creatingAlert}
        >
          <BellPlus size={14} />
          {creatingAlert ? 'Guardando...' : 'Crear alerta'}
        </Button>
      ) : null}
      </div>
      {isMobileViewport && isMobileSheetMounted ? (
        <div
          className={`mobile-filter-sheet ${isMobileSheetVisible ? 'is-open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Filtros de búsqueda"
          onClick={closeMobileFilterSheet}
        >
          <div className="mobile-filter-sheet__panel" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-filter-sheet__handle" aria-hidden="true" />
            <div className="mobile-filter-sheet__header">
              <button
                type="button"
                className="mobile-filter-sheet__close"
                onClick={closeMobileFilterSheet}
                aria-label="Cerrar filtros"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mobile-filter-sheet__body">
              <div className="mobile-filter-segment" aria-label="Operación">
                {[
                  { label: 'Comprar', value: 'venta' as const },
                  { label: 'Alquilar', value: 'alquiler' as const },
                  { label: 'Permuta', value: 'permuta' as const },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={filters.operations.includes(item.value) ? 'is-active' : ''}
                    onClick={() => handleOperationToggle(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

            <section className="mobile-filter-section">
              <h3>Ubicación</h3>
              <label className="mobile-filter-location">
                <input
                  type="text"
                  value={filters.query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  placeholder="Cuba"
                  aria-label="Buscar ubicación"
                />
              </label>
            </section>

            {!isPermuta ? (
              <section className="mobile-filter-section">
                <h3>Valor</h3>
                <div className="mobile-filter-price-mode">
                  <button
                    type="button"
                    className={isRent ? '' : 'is-active'}
                    onClick={() => handleFilterUpdate({ operations: ['venta'], priceRange: 'all' })}
                  >
                    Valor total
                  </button>
                  <button
                    type="button"
                    className={isRent ? 'is-active' : ''}
                    onClick={() => handleFilterUpdate({ operations: ['alquiler'], priceRange: 'all' })}
                  >
                    Alquiler
                  </button>
                </div>
                <div className="mobile-filter-price-grid">
                  <label>
                    <span>Mínimo</span>
                    <Input
                      type="number"
                      placeholder="USD 0"
                      value={minPriceInput}
                      onChange={(event) => setMinPriceInput(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Máximo</span>
                    <Input
                      type="number"
                      placeholder="USD"
                      value={maxPriceInput}
                      onChange={(event) => setMaxPriceInput(event.target.value)}
                    />
                  </label>
                </div>
                <div className="mobile-filter-chips" aria-label="Rangos de precio">
                  {activePriceOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={filters.priceRange === item.value ? 'is-active' : ''}
                      onClick={() => handlePriceRangeSelect(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="mobile-filter-apply-price" onClick={handleCustomPriceApply}>
                  Aplicar precio
                </button>
              </section>
            ) : null}

            <section className="mobile-filter-section">
              <h3>Tipos de inmueble</h3>
              {propertyTypeOptions.map((type) => (
                <label key={type} className="mobile-filter-check">
                  <input
                    type="checkbox"
                    checked={filters.propertyType === type}
                    onChange={() => handlePropertyTypeSelect(type)}
                  />
                  <span>{type === 'apartamento' ? 'Apartamento' : type === 'casa' ? 'Casa' : 'Terreno'}</span>
                </label>
              ))}
            </section>

            <section className="mobile-filter-section">
              <h3>Recámaras</h3>
              <div className="mobile-filter-chips">
                {segmentOptions.map((num) => {
                  const isActive = (filters.bedrooms ?? 'all') === num
                  return (
                    <button
                      key={num}
                      type="button"
                      className={isActive ? 'is-active' : ''}
                      onClick={() => handleSegmentUpdate('bedrooms', num === 'all' ? 'all' : Number(num))}
                    >
                      {num === 'all' ? 'Todos' : `${num}+`}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="mobile-filter-section">
              <h3>Parqueo</h3>
              <div className="mobile-filter-chips">
                {parkingOptions.map((num) => {
                  const isActive = (filters.parking ?? 'all') === num
                  return (
                    <button
                      key={num}
                      type="button"
                      className={isActive ? 'is-active' : ''}
                      onClick={() => handleSegmentUpdate('parking', num === 'all' ? 'all' : Number(num))}
                    >
                      {num === 'all' ? 'Cualquiera' : `${num}+`}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="mobile-filter-section">
              <h3>Baños</h3>
              <div className="mobile-filter-chips">
                {segmentOptions.map((num) => {
                  const isActive = (filters.bathrooms ?? 'all') === num
                  return (
                    <button
                      key={num}
                      type="button"
                      className={isActive ? 'is-active' : ''}
                      onClick={() => handleSegmentUpdate('bathrooms', num === 'all' ? 'all' : Number(num))}
                    >
                      {num === 'all' ? 'Todos' : `${num}+`}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

            <div className="mobile-filter-sheet__footer">
              <button
                type="button"
                className="mobile-filter-clear"
                onClick={() => {
                  onClearFilters()
                  setMinPriceInput('')
                  setMaxPriceInput('')
                }}
              >
                Limpiar
              </button>
              {onCreateAlert ? (
                <button
                  type="button"
                  className="mobile-filter-alert"
                  onClick={onCreateAlert}
                  disabled={creatingAlert}
                >
                  <BellPlus size={15} />
                  {creatingAlert ? 'Guardando...' : 'Alerta'}
                </button>
              ) : null}
              <button type="button" className="mobile-filter-submit" onClick={closeMobileFilterSheet}>
                Ver {totalResults} inmuebles
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

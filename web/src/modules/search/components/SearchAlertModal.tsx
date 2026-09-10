import { X, BellRing } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from '../../../shared/ui/button'
import { MODAL_LAYER_STYLE } from '../../../shared/ui/layers'
import type { SearchFilters } from '../types'
import { getOperationLabel, getPropertyTypeLabel, getPriceLabel } from '../lib/filterOptions'

interface SearchAlertModalProps {
  isOpen: boolean
  onClose: () => void
  onGoToAccount?: () => void
  filters: SearchFilters
  isError?: boolean
  errorMessage?: string | null
}

export function SearchAlertModal({
  isOpen,
  onClose,
  onGoToAccount,
  filters,
  isError = false,
  errorMessage,
}: SearchAlertModalProps) {
  if (!isOpen) return null

  const operationLabel = getOperationLabel(filters)
  const typeLabel = getPropertyTypeLabel(filters)
  const priceLabel = getPriceLabel(filters)

  const activeFilters = [
    filters.query ? `Ubicación: ${filters.query}` : null,
    operationLabel !== 'Operación' ? `Operación: ${operationLabel}` : null,
    typeLabel !== 'Inmueble' ? `Tipo: ${typeLabel}` : null,
    priceLabel !== 'Precio' ? `Precio: ${priceLabel}` : null,
    filters.bedrooms && filters.bedrooms !== 'all' ? `Cuartos: ${filters.bedrooms}+` : null,
    filters.bathrooms && filters.bathrooms !== 'all' ? `Baños: ${filters.bathrooms}+` : null,
    filters.parking && filters.parking !== 'all' ? `Parqueos: ${filters.parking}+` : null,
  ].filter(Boolean)

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
      style={MODAL_LAYER_STYLE}
      role="dialog"
      aria-modal="true"
      aria-label={isError ? "Error al crear alerta" : "Alerta de búsqueda creada"}
    >
      <div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-75 fade-in duration-300 ease-out text-center">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        {isError ? (
          <>
            <div className="flex flex-col items-center mt-2 mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <svg aria-hidden="true" focusable="false" className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-neutral-900 mb-2">
                No se pudo crear la alerta
              </h2>
              <p className="text-xs text-neutral-500 max-w-[320px] leading-relaxed">
                {errorMessage || 'Ocurrió un error inesperado al intentar guardar tu alerta. Por favor, inténtalo de nuevo.'}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full">
              <Button
                type="button"
                className="w-full h-12 rounded-xl bg-[#035f53] hover:bg-[#024a41] text-white font-semibold"
                onClick={onClose}
              >
                Cerrar
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center mt-2 mb-6">
              <div className="w-16 h-16 bg-[#035f53]/10 rounded-full flex items-center justify-center mb-4">
                <BellRing size={32} className="text-[#035f53] animate-[pulse_2s_infinite]" />
              </div>
              <h2 className="text-2xl font-extrabold text-neutral-900 mb-2">
                ¡Alerta de búsqueda creada!
              </h2>
              <p className="text-xs text-neutral-500 max-w-[320px] leading-relaxed">
                Guardamos estos filtros para que puedas consultar y administrar la alerta desde tu cuenta.
              </p>
            </div>

            {activeFilters.length > 0 && (
              <div className="bg-neutral-50 rounded-2xl p-4 mb-4 text-left border border-neutral-100">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#035f53] mb-2">
                  Filtros configurados
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeFilters.map((filterText, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-full bg-white border border-neutral-200 px-2.5 py-1 text-[11px] font-bold text-neutral-700 shadow-sm"
                    >
                      {filterText}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 w-full font-bold">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-xl text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                onClick={onClose}
              >
                Entendido
              </Button>
              {onGoToAccount && (
                <Button
                  type="button"
                  className="flex-1 h-12 rounded-xl bg-[#035f53] hover:bg-[#024a41] text-white"
                  onClick={() => {
                    onClose()
                    onGoToAccount()
                  }}
                >
                  Ver en Mi cuenta
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

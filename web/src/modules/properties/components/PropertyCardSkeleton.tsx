import type React from 'react'

export type PropertyCardSkeletonProps = {
  count?: number
}

export function PropertyCardSkeleton({ count = 6 }: PropertyCardSkeletonProps) {
  const items = Array.from({ length: count })
  const textStyle: React.CSSProperties = { color: 'transparent', userSelect: 'none', fontSize: '11px', lineHeight: 1 }

  return (
    <>
      {items.map((_, index) => (
        <article
          key={index}
          className="property-card cursor-default select-none pointer-events-none"
          style={{ contentVisibility: 'auto' }}
        >
          {/* Foto con efecto Shimmer */}
          <div className="property-photo relative overflow-hidden bg-neutral-200 animate-pulse" style={{ aspectRatio: '16/9' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
          </div>

          <div className="property-info">
            {/* Badges de carga */}
            <div className="property-badges-row">
              <span className="property-type-badge bg-neutral-200 animate-pulse" style={textStyle}>
                DEPARTAMENTO
              </span>
              <span className="property-operation-badge bg-neutral-200 animate-pulse" style={textStyle}>
                VENTA
              </span>
            </div>

            {/* Precio */}
            <div className="property-price-row">
              <span className="inline-block w-24 h-6 bg-neutral-200 rounded animate-pulse" style={textStyle}>
                $000,000
              </span>
            </div>

            {/* Título */}
            <h2 className="property-title">
              <span className="block w-full h-4 bg-neutral-200 rounded animate-pulse mb-1" style={textStyle}>
                Cargando titulo del anuncio de vivienda
              </span>
              <span className="block w-3/4 h-4 bg-neutral-200 rounded animate-pulse" style={textStyle}>
                Detalles de la ubicacion
              </span>
            </h2>

            {/* Especificaciones */}
            <div className="property-specs-grid">
              <span className="spec-item bg-neutral-200 rounded animate-pulse" style={textStyle}>
                0 Recám.
              </span>
              <span className="spec-item bg-neutral-200 rounded animate-pulse" style={textStyle}>
                0 Baño
              </span>
              <span className="spec-item bg-neutral-200 rounded animate-pulse" style={textStyle}>
                00 m²
              </span>
            </div>

            {/* Botones de acción simulados */}
            <div className="property-actions">
              <div className="flex-1 h-8 bg-neutral-200 rounded-full animate-pulse" style={textStyle}>
                Contactar
              </div>
              <div className="flex-1 h-8 bg-neutral-200 rounded-full animate-pulse" style={textStyle}>
                Consultar
              </div>
            </div>
          </div>
        </article>
      ))}
    </>
  )
}

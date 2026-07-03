export type PropertyCardSkeletonProps = {
  count?: number
}

export function PropertyCardSkeleton({ count = 6 }: PropertyCardSkeletonProps) {
  const items = Array.from({ length: count })

  return (
    <>
      {items.map((_, index) => (
        <article
          key={index}
          className="property-card cursor-default select-none pointer-events-none"
          style={{ contentVisibility: 'auto' }}
        >
          {/* Foto con efecto Shimmer */}
          <div className="property-photo relative overflow-hidden bg-neutral-200 animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
          </div>

          <div className="property-info space-y-3">
            {/* Badges de carga */}
            <div className="flex gap-2">
              <div className="w-16 h-4 bg-neutral-200 rounded animate-pulse" />
              <div className="w-12 h-4 bg-neutral-200 rounded animate-pulse" />
            </div>

            {/* Precio */}
            <div className="w-24 h-6 bg-neutral-200 rounded animate-pulse" />

            {/* Título */}
            <div className="space-y-1.5">
              <div className="w-full h-4 bg-neutral-200 rounded animate-pulse" />
              <div className="w-3/4 h-4 bg-neutral-200 rounded animate-pulse" />
            </div>

            {/* Especificaciones */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="h-4 bg-neutral-200 rounded animate-pulse" />
              <div className="h-4 bg-neutral-200 rounded animate-pulse" />
              <div className="h-4 bg-neutral-200 rounded animate-pulse" />
              <div className="h-4 bg-neutral-200 rounded animate-pulse" />
            </div>

            {/* Botones de acción simulados */}
            <div className="flex gap-2 pt-2">
              <div className="flex-1 h-9 bg-neutral-200 rounded-full animate-pulse" />
              <div className="flex-1 h-9 bg-neutral-200 rounded-full animate-pulse" />
            </div>
          </div>
        </article>
      ))}
    </>
  )
}

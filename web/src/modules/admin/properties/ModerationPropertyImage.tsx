import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { normalizePropertyImageReference } from '../../properties/utils/images'

type Props = {
  src: string | null | undefined
  alt: string
  className: string
}

export function ModerationPropertyImage({ src, alt, className }: Props) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const normalizedSource = src ? normalizePropertyImageReference(src) : null
  const failed = normalizedSource !== null && failedSource === normalizedSource

  if (!normalizedSource || failed) {
    const label = failed ? 'Imagen no disponible' : 'Sin imagen'
    return (
      <div
        role="img"
        aria-label={`${alt}: ${label.toLowerCase()}`}
        className={`${className} flex flex-col items-center justify-center gap-2 bg-neutral-100 text-xs text-neutral-500`}
      >
        <ImageOff aria-hidden="true" className="h-5 w-5" />
        <span>{label}</span>
      </div>
    )
  }

  return (
    <img
      src={normalizedSource}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setFailedSource(normalizedSource)}
    />
  )
}

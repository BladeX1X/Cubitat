import { useEffect, useState, type ReactNode } from 'react'
import { optimizeCatalogImageUrl } from '../lib/catalogImageUrl'

type MarketplaceCardImageProps = {
  src?: string
  alt: string
  eager?: boolean
  className: string
  fallback: ReactNode
}

export function MarketplaceCardImage({ src, alt, eager = false, className, fallback }: MarketplaceCardImageProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [src])

  if (!src || failed) return <>{fallback}</>

  return (
    <img
      src={optimizeCatalogImageUrl(src)}
      alt={alt}
      width="420"
      height="192"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : 'low'}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

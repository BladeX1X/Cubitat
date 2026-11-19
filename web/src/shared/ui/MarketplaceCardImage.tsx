import { useEffect, useRef, useState, type ReactNode } from 'react'
import { optimizeCatalogImageUrl } from '../lib/catalogImageUrl'
import { signCatalogCardImage } from '../lib/catalogStorageImage'

type MarketplaceCardImageProps = {
  src?: string
  storageBucket?: string
  alt: string
  eager?: boolean
  className: string
  fallback: ReactNode
  failureFallback?: ReactNode
}

export function MarketplaceCardImage({ src, storageBucket, alt, eager = false, className, fallback, failureFallback }: MarketplaceCardImageProps) {
  const [failed, setFailed] = useState(false)
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)
  const [nearViewport, setNearViewport] = useState(eager)
  const imageRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    setFailed(false)
    setResolvedSrc(null)
    setNearViewport(eager)
    if (!src || !storageBucket || /^https:\/\//i.test(src)) {
      if (src) setResolvedSrc(optimizeCatalogImageUrl(src))
      return
    }
    if (eager || typeof IntersectionObserver === 'undefined') {
      setNearViewport(true)
      return
    }

    const target = imageRef.current
    if (!target) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setNearViewport(true)
        observer.disconnect()
      }
    }, { rootMargin: '400px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [src, storageBucket, eager])

  useEffect(() => {
    if (!src || !nearViewport || !storageBucket || /^https:\/\//i.test(src)) return
    let active = true
    void signCatalogCardImage(storageBucket, src).then((signedUrl) => {
      if (!active) return
      if (signedUrl) setResolvedSrc(signedUrl)
      else setFailed(true)
    })
    return () => { active = false }
  }, [src, storageBucket, nearViewport])

  if (!src) return <>{fallback}</>
  if (failed) return <>{failureFallback ?? fallback}</>
  if (!resolvedSrc) return <span ref={imageRef} className="block h-full w-full" aria-hidden="true">{fallback}</span>

  return (
    <img
      src={resolvedSrc}
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

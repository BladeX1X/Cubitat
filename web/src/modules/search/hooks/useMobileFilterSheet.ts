import { useCallback, useEffect, useState } from 'react'

const MOBILE_FILTER_QUERY = '(max-width: 640px)'
const SHEET_ANIMATION_MS = 620

export function useMobileFilterSheet(isOpen: boolean, setIsOpen: (isOpen: boolean) => void) {
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(MOBILE_FILTER_QUERY)
    const updateViewport = () => setIsMobileViewport(query.matches)

    updateViewport()
    query.addEventListener('change', updateViewport)

    return () => query.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    if (!isMobileViewport) {
      setIsMounted(false)
      setIsVisible(false)
      return
    }

    if (isOpen) {
      setIsMounted(true)
      setIsVisible(false)
      const timeout = window.setTimeout(() => setIsVisible(true), 90)
      return () => window.clearTimeout(timeout)
    }

    setIsVisible(false)
    const timeout = window.setTimeout(() => setIsMounted(false), SHEET_ANIMATION_MS)
    return () => window.clearTimeout(timeout)
  }, [isMobileViewport, isOpen])

  useEffect(() => {
    if (!isMobileViewport || !isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileViewport, isOpen])

  const close = useCallback(() => {
    setIsVisible(false)
    window.setTimeout(() => {
      setIsOpen(false)
      setIsMounted(false)
    }, SHEET_ANIMATION_MS)
  }, [setIsOpen])

  return {
    isMobileViewport,
    isMounted,
    isVisible,
    close,
  }
}

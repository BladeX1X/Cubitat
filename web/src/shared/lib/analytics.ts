const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-K5PDNSNSGQ'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let initialized = false
let lastTrackedPath: string | null = null

export function initAnalytics() {
  if (!GA_MEASUREMENT_ID || initialized || typeof window === 'undefined') {
    return
  }

  window.dataLayer = window.dataLayer || []

  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args)
    }
  }

  const existingScript = document.querySelector(
    `script[src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`,
  )

  if (!existingScript) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    document.head.appendChild(script)
  }

  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
  })

  initialized = true
}

export function trackPageView(path = window.location.pathname + window.location.search) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') {
    return
  }

  initAnalytics()

  if (lastTrackedPath === path) {
    return
  }

  lastTrackedPath = path

  window.gtag?.('event', 'page_view', {
    send_to: GA_MEASUREMENT_ID,
    page_location: window.location.origin + path,
    page_path: path,
    page_title: document.title,
  })
}

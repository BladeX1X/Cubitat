const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-K5PDNSNSGQ'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let initialized = false
let lastTrackedPath: string | null = null
let scriptScheduled = false

function loadAnalyticsScript() {
  const existingScript = document.querySelector(
    `script[src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`,
  )

  if (existingScript) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)
}

function scheduleAnalyticsScript() {
  if (scriptScheduled) return
  scriptScheduled = true

  const scheduleIdle = () => {
    setTimeout(loadAnalyticsScript, 8000)
  }

  if (document.readyState === 'complete') {
    scheduleIdle()
    return
  }

  window.addEventListener('load', scheduleIdle, { once: true })
}

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

  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
  })

  scheduleAnalyticsScript()

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

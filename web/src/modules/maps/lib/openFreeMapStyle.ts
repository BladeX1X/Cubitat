import type { StyleSpecification } from 'maplibre-gl'

const OPEN_SOURCE_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const STYLE_FETCH_TIMEOUT_MS = 12_000

let cachedStyle: StyleSpecification | null = null
let stylePromise: Promise<StyleSpecification> | null = null

export function getOpenFreeMapStyle(signal?: AbortSignal): Promise<StyleSpecification> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Map style request aborted', 'AbortError'))
  }

  if (cachedStyle) {
    return Promise.resolve(cloneStyle(cachedStyle))
  }

  stylePromise ||= fetchStyleWithTimeout()

  return stylePromise.then((style) => {
    if (signal?.aborted) {
      throw new DOMException('Map style request aborted', 'AbortError')
    }
    return cloneStyle(style)
  })
}

function fetchStyleWithTimeout(): Promise<StyleSpecification> {
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort()
      reject(new Error('map_style_timeout'))
    }, STYLE_FETCH_TIMEOUT_MS)
  })

  return Promise.race([
    fetch(OPEN_SOURCE_STYLE, { cache: 'force-cache', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`No se pudo cargar el estilo del mapa (${response.status})`)
        return await response.json() as StyleSpecification
      }),
    timeoutPromise,
  ]).then((style) => {
    cachedStyle = style
    return style
  }).catch((error: unknown) => {
    stylePromise = null
    throw error
  }).finally(() => {
    if (timeout !== undefined) clearTimeout(timeout)
  })
}

function cloneStyle(style: StyleSpecification): StyleSpecification {
  return JSON.parse(JSON.stringify(style)) as StyleSpecification
}

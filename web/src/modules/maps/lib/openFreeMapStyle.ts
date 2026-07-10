import type { StyleSpecification } from 'maplibre-gl'

const OPEN_SOURCE_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

let cachedStyle: StyleSpecification | null = null
let stylePromise: Promise<StyleSpecification> | null = null

export function getOpenFreeMapStyle(signal?: AbortSignal): Promise<StyleSpecification> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Map style request aborted', 'AbortError'))
  }

  if (cachedStyle) {
    return Promise.resolve(cloneStyle(cachedStyle))
  }

  stylePromise ||= fetch(OPEN_SOURCE_STYLE, { cache: 'force-cache' })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar el estilo del mapa (${response.status})`)
      }

      cachedStyle = await response.json() as StyleSpecification
      return cachedStyle
    })
    .catch((error) => {
      stylePromise = null
      throw error
    })

  return stylePromise.then((style) => {
    if (signal?.aborted) {
      throw new DOMException('Map style request aborted', 'AbortError')
    }
    return cloneStyle(style)
  })
}

function cloneStyle(style: StyleSpecification): StyleSpecification {
  return JSON.parse(JSON.stringify(style)) as StyleSpecification
}

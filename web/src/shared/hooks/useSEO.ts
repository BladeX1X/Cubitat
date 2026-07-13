import { useEffect } from 'react'

interface SEOProps {
  title: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'article'
}

const DEFAULT_DESCRIPTION =
  'Cubitat es el portal inmobiliario para buscar, comprar, vender y rentar propiedades en Cuba.'
const DEFAULT_IMAGE = 'https://cubitathome.com/og-image.jpg'

function getCurrentDocumentUrl() {
  return `${window.location.origin}${window.location.pathname}`
}

export function useSEO({ title, description, image, url, type = 'website' }: SEOProps) {
  useEffect(() => {
    // 1. Actualizar título
    const formattedTitle = title.includes('Cubitat') ? title : `${title} | Cubitat`
    document.title = formattedTitle

    // Helper para actualizar o crear etiquetas meta
    const setMetaTag = (attributeName: string, attributeValue: string, content: string) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attributeName, attributeValue)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    const resolvedDescription = description ?? DEFAULT_DESCRIPTION
    const resolvedImage = image ?? DEFAULT_IMAGE
    const resolvedUrl = url ?? getCurrentDocumentUrl()

    // 2. Actualizar meta descripción general
    setMetaTag('name', 'description', resolvedDescription)

    // 3. Actualizar metadatos Open Graph (Facebook/WhatsApp/Telegram)
    setMetaTag('property', 'og:title', formattedTitle)
    setMetaTag('property', 'og:description', resolvedDescription)
    setMetaTag('property', 'og:image', resolvedImage)
    setMetaTag('property', 'og:url', resolvedUrl)
    setMetaTag('property', 'og:type', type)

    // 4. Actualizar metadatos Twitter Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image')
    setMetaTag('name', 'twitter:title', formattedTitle)
    setMetaTag('name', 'twitter:description', resolvedDescription)
    setMetaTag('name', 'twitter:image', resolvedImage)
  }, [title, description, image, url, type])
}

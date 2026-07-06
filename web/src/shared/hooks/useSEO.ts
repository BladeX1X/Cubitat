import { useEffect } from 'react'

interface SEOProps {
  title: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'article'
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

    // 2. Actualizar meta descripción general
    if (description) {
      setMetaTag('name', 'description', description)
    }

    // 3. Actualizar metadatos Open Graph (Facebook/WhatsApp/Telegram)
    setMetaTag('property', 'og:title', formattedTitle)
    if (description) {
      setMetaTag('property', 'og:description', description)
    }
    if (image) {
      setMetaTag('property', 'og:image', image)
    }
    if (url) {
      setMetaTag('property', 'og:url', url)
    }
    setMetaTag('property', 'og:type', type)

    // 4. Actualizar metadatos Twitter Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image')
    setMetaTag('name', 'twitter:title', formattedTitle)
    if (description) {
      setMetaTag('name', 'twitter:description', description)
    }
    if (image) {
      setMetaTag('name', 'twitter:image', image)
    }
  }, [title, description, image, url, type])
}

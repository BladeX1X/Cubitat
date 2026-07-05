import { useEffect } from 'react'

interface SEOProps {
  title: string
  description?: string
}

export function useSEO({ title, description }: SEOProps) {
  useEffect(() => {
    // Actualizar título
    const formattedTitle = title.includes('Cubitat') ? title : `${title} | Cubitat`
    document.title = formattedTitle

    // Actualizar meta descripción
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.setAttribute('name', 'description')
        document.head.appendChild(metaDescription)
      }
      metaDescription.setAttribute('content', description)
    }
  }, [title, description])
}

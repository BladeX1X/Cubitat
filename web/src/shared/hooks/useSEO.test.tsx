import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSEO } from './useSEO'

type SEOProbeProps = Parameters<typeof useSEO>[0]

function SEOProbe(props: SEOProbeProps) {
  useSEO(props)
  return null
}

function metaContent(selector: string) {
  return document.head.querySelector<HTMLMetaElement>(selector)?.content
}

describe('useSEO', () => {
  it('elimina query string y fragmento de una URL explicita', () => {
    render(
      <SEOProbe
        title="Casa demo"
        url="https://cubitathome.com/propiedad/casa-demo?utm_source=qa#galeria"
      />,
    )

    expect(metaContent('meta[property="og:url"]')).toBe(
      'https://cubitathome.com/propiedad/casa-demo',
    )
  })

  it('reemplaza los metadatos opcionales al navegar a una pagina sin valores propios', () => {
    window.history.replaceState({}, '', '/propiedad/casa-demo?token=secreto#galeria')

    const { rerender } = render(
      <SEOProbe
        title="Casa demo"
        description="Descripcion privada de la propiedad"
        image="https://example.com/property.jpg"
        url="https://cubitathome.com/propiedad/casa-demo"
        type="article"
      />,
    )

    window.history.replaceState({}, '', '/mi-cuenta?token=secreto#perfil')
    rerender(<SEOProbe title="Mi Cuenta" />)

    expect(metaContent('meta[name="description"]')).toBe(
      'Cubitat es el portal inmobiliario para buscar, comprar, vender y rentar propiedades en Cuba.',
    )
    expect(metaContent('meta[property="og:description"]')).toBe(
      'Cubitat es el portal inmobiliario para buscar, comprar, vender y rentar propiedades en Cuba.',
    )
    expect(metaContent('meta[property="og:image"]')).toBe('https://cubitathome.com/og-image.jpg')
    expect(metaContent('meta[property="og:url"]')).toBe(`${window.location.origin}/mi-cuenta`)
    expect(metaContent('meta[property="og:type"]')).toBe('website')
    expect(metaContent('meta[name="twitter:image"]')).toBe('https://cubitathome.com/og-image.jpg')
    expect(metaContent('meta[property="og:url"]')).not.toContain('token=secreto')
  })
})

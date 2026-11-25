import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MarketplaceListingDetail } from './MarketplaceListingDetail'

describe('MarketplaceListingDetail media controls', () => {
  it('opens the photo/map viewer, switches tabs, and closes with Escape', () => {
    render(
      <MarketplaceListingDetail
        backLabel="Volver"
        breadcrumb="Servicios"
        category="Plomería"
        title="Plomero"
        location="La Habana"
        images={['/photo-one.jpg', '/photo-two.jpg']}
        imageLabel="Fotos de Plomero"
        imageFallback={<span>Sin fotos</span>}
        renderImage={(src) => <img src={src} alt="Foto de trabajo" />}
        mapLabel="Mapa del servicio en La Habana"
        mapContent={<div>Mapa aproximado de La Habana</div>}
        contactActions={<div />}
        contactPanel={<div />}
        onBack={vi.fn()}
      >
        <div>Contenido</div>
      </MarketplaceListingDetail>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Abrir fotos' }))
    expect(screen.getByRole('dialog', { name: 'Fotos y mapa de Plomero' })).toBeInTheDocument()
    const dialog = screen.getByRole('dialog', { name: 'Fotos y mapa de Plomero' })
    expect(within(dialog).getAllByRole('img', { name: 'Foto de trabajo' })).toHaveLength(2)

    fireEvent.click(within(dialog).getByRole('tab', { name: 'Mapa' }))
    expect(screen.getByText('Mapa aproximado de La Habana')).toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'Mapa del servicio en La Habana' })).toBeInTheDocument()
    expect(screen.queryByText('La ubicación exacta no está disponible.')).not.toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('uses the same selected photo in the carousel and the viewer', () => {
    render(
      <MarketplaceListingDetail
        backLabel="Volver"
        breadcrumb="Materiales"
        category="Cemento"
        title="Cemento gris"
        location="Granma"
        images={['/photo-one.jpg', '/photo-two.jpg']}
        imageLabel="Fotos de Cemento gris"
        imageFallback={<span>Sin fotos</span>}
        renderImage={(src) => <img src={src} alt={src} />}
        mapLabel="Mapa de material en Granma"
        mapContent={<div>Mapa</div>}
        contactActions={<div />}
        contactPanel={<div />}
        onBack={vi.fn()}
      >
        <div>Contenido</div>
      </MarketplaceListingDetail>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ver foto 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir fotos' }))
    expect(screen.getAllByRole('img', { name: '/photo-two.jpg' })).toHaveLength(2)
  })
})

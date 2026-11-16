import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MarketplaceMapToggle } from './MarketplaceMapToggle'

describe('MarketplaceMapToggle', () => {
  it('muestra el mapa y solicita alternar su estado', () => {
    const onToggle = vi.fn()

    render(<MarketplaceMapToggle open={false} mapId="service-province-map" onToggle={onToggle} />)

    const button = screen.getByRole('button', { name: 'Mostrar mapa' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).not.toHaveAttribute('aria-controls')
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('indica que el mapa se puede ocultar cuando está abierto', () => {
    render(<MarketplaceMapToggle open mapId="materials-province-map" onToggle={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Ocultar mapa' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Ocultar mapa' })).toHaveAttribute('aria-controls', 'materials-province-map')
  })
})

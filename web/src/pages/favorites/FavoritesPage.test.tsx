import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FavoritesPage } from './FavoritesPage'

vi.mock('../../modules/properties/hooks/useSavedProperties', () => ({
  useSavedProperties: () => ({
    savedPropertyIds: new Set<string>(),
    loading: false,
  }),
}))

describe('FavoritesPage', () => {
  it('muestra un estado vacio accesible cuando no hay favoritos', () => {
    const { container } = render(
      <FavoritesPage
        properties={[]}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onSelectProperty={vi.fn()}
        onGoResults={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: /todavía no tienes favoritos/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /buscar propiedades/i })).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CatalogPagination } from './CatalogPagination'

describe('CatalogPagination', () => {
  it('shows numbered pages and marks the active page', () => {
    render(<CatalogPagination currentPage={5} totalPages={9} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Página 5' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Página 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 9' })).toBeInTheDocument()
    expect(screen.getAllByText('…')).toHaveLength(2)
  })

  it('calls the page callback and disables edge navigation', () => {
    const onPageChange = vi.fn()
    render(<CatalogPagination currentPage={1} totalPages={3} onPageChange={onPageChange} />)

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('does not render pagination for a single page', () => {
    render(<CatalogPagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />)

    expect(screen.queryByRole('navigation', { name: 'Paginación del catálogo' })).not.toBeInTheDocument()
  })
})

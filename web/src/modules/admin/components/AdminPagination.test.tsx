import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AdminPagination } from './AdminPagination'

describe('AdminPagination', () => {
  it('shows numbered pages with the current page and ellipses for distant ranges', () => {
    render(<AdminPagination page={1} total={306} pageSize={15} itemLabel="propiedades" onPageChange={vi.fn()} />)

    expect(screen.getByRole('navigation', { name: 'Paginación de propiedades' })).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 21 (306 propiedades)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Página 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 3' })).toBeInTheDocument()
    expect(screen.getByText('…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 21' })).toBeInTheDocument()
  })

  it('changes directly to the selected page and disables navigation at the boundaries', () => {
    const onPageChange = vi.fn()
    const { rerender } = render(<AdminPagination page={0} total={60} pageSize={15} itemLabel="propiedades" onPageChange={onPageChange} />)

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    rerender(<AdminPagination page={1} total={60} pageSize={15} itemLabel="propiedades" onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Página 3' }))
    expect(onPageChange).toHaveBeenCalledWith(2)

    rerender(<AdminPagination page={3} total={60} pageSize={15} itemLabel="propiedades" onPageChange={onPageChange} />)
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it('does not render when all items fit on one page', () => {
    const { container } = render(<AdminPagination page={0} total={15} pageSize={15} itemLabel="propiedades" onPageChange={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PropertyVisibilityActions } from './PropertyVisibilityActions'

describe('PropertyVisibilityActions', () => {
  it('lets the owner hide a published property', () => {
    render(<PropertyVisibilityActions status="published" loading={false} onHide={vi.fn()} onRestore={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^ocultar$/i })).toBeInTheDocument()
  })

  it('lets the owner restore their own hidden property', () => {
    render(<PropertyVisibilityActions status="owner_hidden" loading={false} onHide={vi.fn()} onRestore={vi.fn()} />)
    expect(screen.getByRole('button', { name: /volver a publicar/i })).toBeInTheDocument()
  })

  it('does not expose visibility actions for administratively paused properties', () => {
    const { container } = render(<PropertyVisibilityActions status="paused" loading={false} onHide={vi.fn()} onRestore={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})

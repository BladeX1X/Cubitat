import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AdminNoticeDialog } from './AdminNoticeDialog'

describe('AdminNoticeDialog', () => {
  it('exposes its visible title and message as the alert dialog name and description', () => {
    render(<AdminNoticeDialog message="No se pudo cargar la moderación." onClose={vi.fn()} />)

    expect(screen.getByRole('alertdialog', {
      name: 'Aviso del Sistema',
      description: 'No se pudo cargar la moderación.',
    })).toBeInTheDocument()
  })
})

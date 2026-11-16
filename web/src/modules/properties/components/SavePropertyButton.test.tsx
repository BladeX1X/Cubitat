import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SavePropertyButton } from './SavePropertyButton'

const mocks = vi.hoisted(() => ({
  isSaved: vi.fn(() => false),
  toggleSave: vi.fn(),
  sessionReady: false,
}))

vi.mock('../hooks/useSavedProperties', () => ({
  useSavedProperties: () => ({
    isSaved: mocks.isSaved,
    toggleSave: mocks.toggleSave,
    sessionReady: mocks.sessionReady,
  }),
}))

describe('SavePropertyButton session readiness', () => {
  beforeEach(() => {
    mocks.sessionReady = false
    mocks.toggleSave.mockClear()
  })

  it('does not invite a premature login prompt while session is unresolved', () => {
    render(<SavePropertyButton propertyId="property-1" propertyTitle="Casa en Playa" />)

    const button = screen.getByRole('button', { name: 'Guardar Casa en Playa' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('title', 'Comprobando tu sesión…')
    fireEvent.click(button)
    expect(mocks.toggleSave).not.toHaveBeenCalled()
  })

  it('enables the favorite action after session resolution', () => {
    mocks.sessionReady = true
    render(<SavePropertyButton propertyId="property-1" propertyTitle="Casa en Playa" />)

    const button = screen.getByRole('button', { name: 'Guardar Casa en Playa' })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(mocks.toggleSave).toHaveBeenCalledWith('property-1')
  })
})

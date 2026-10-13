import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TrustScoreDisclosure } from './TrustScoreDisclosure'
import { fetchPropertyTrustScore } from './trustScoreRepository'

vi.mock('./trustScoreRepository', () => ({ fetchPropertyTrustScore: vi.fn() }))

const mockedFetchTrustScore = vi.mocked(fetchPropertyTrustScore)

beforeEach(() => vi.clearAllMocks())

const score = {
  score: 60,
  identity_verified: true,
  document_verified: false,
  published: true,
  contact_present: true,
  internal_indicator: 'internal_indicator_not_legal_certification',
}

describe('TrustScoreDisclosure', () => {
  it('loads and explains the internal score only when requested', async () => {
    mockedFetchTrustScore.mockResolvedValue(score)

    render(<TrustScoreDisclosure propertyId="property-1" />)

    expect(mockedFetchTrustScore).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ver indicador interno' }))

    expect(await screen.findByText('60/100')).toBeInTheDocument()
    expect(screen.getByText('Identidad verificada')).toBeInTheDocument()
    expect(screen.getByText('Documento pendiente')).toBeInTheDocument()
    expect(screen.getByText('Publicada sí')).toBeInTheDocument()
    expect(screen.getByText('Contacto sí')).toBeInTheDocument()
    expect(screen.getByText(/no es una certificación legal/i)).toBeInTheDocument()
    expect(mockedFetchTrustScore).toHaveBeenCalledWith('property-1')
  })

  it('shows a recoverable error and retries on demand', async () => {
    mockedFetchTrustScore
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce(score)

    render(<TrustScoreDisclosure propertyId="property-2" />)
    fireEvent.click(screen.getByRole('button', { name: 'Ver indicador interno' }))

    expect(await screen.findByText('No se pudo calcular el indicador de confianza.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(screen.getByText('60/100')).toBeInTheDocument())
    expect(mockedFetchTrustScore).toHaveBeenCalledTimes(2)
  })
})

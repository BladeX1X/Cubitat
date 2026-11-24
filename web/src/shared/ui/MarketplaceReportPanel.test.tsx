import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MarketplaceReportPanel } from './MarketplaceReportPanel'

vi.mock('./TurnstileWidget', () => ({ TurnstileWidget: ({ onVerify }: { onVerify: (token: string) => void }) => <button type="button" onClick={() => onVerify('test-token')}>Verificar</button> }))

describe('MarketplaceReportPanel', () => {
  beforeEach(() => vi.restoreAllMocks())

  it.each([
    ['service', 'servicio sospechoso'],
    ['material', 'material sospechoso'],
  ] as const)('adapts the report panel for a %s listing', async (listingType, expectedTitle) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 201 }))
    render(<MarketplaceReportPanel listingType={listingType} listingId="11111111-1111-4111-8111-111111111111" listingTitle="Anuncio demo" />)
    expect(screen.getByRole('region', { name: `Reporta un ${expectedTitle}` })).toHaveClass('bg-[#fdfaf2]')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Informar sobre un problema' }))
    const dialog = screen.getByRole('dialog', { name: 'Informar sobre un problema' })
    expect(dialog).toHaveClass('max-w-md')
    expect(screen.getByRole('heading', { name: `Reporta un ${expectedTitle}` })).toBeInTheDocument()
    expect(dialog).toHaveTextContent('Anuncio: Anuncio demo')
    fireEvent.change(within(dialog).getByLabelText('Motivo del reporte'), { target: { value: 'FRAUD' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar reporte' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/public/marketplace-report', expect.objectContaining({ method: 'POST' })))
    expect(await within(dialog).findByRole('status')).toHaveTextContent('¡Reporte enviado con éxito!')
    expect(fetchMock).toHaveBeenCalledWith('/api/public/marketplace-report', expect.objectContaining({
      body: expect.stringContaining(`"listing_type":"${listingType}"`),
    }))
  })

  it('closes the modal with Escape without submitting', () => {
    render(<MarketplaceReportPanel listingType="material" listingId="11111111-1111-4111-8111-111111111111" listingTitle="Anuncio demo" />)
    fireEvent.click(screen.getByRole('button', { name: 'Informar sobre un problema' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Informar sobre un problema' })).toBeInTheDocument()
  })
})

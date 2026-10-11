import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PropertyVerificationPanel } from './PropertyVerificationPanel'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  maybeSingle: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
    storage: { from: mocks.storageFrom },
    rpc: mocks.rpc,
  },
}))

describe('PropertyVerificationPanel', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    mocks.limit.mockReturnValue({ maybeSingle: mocks.maybeSingle })
    mocks.order.mockReturnValue({ limit: mocks.limit })
    mocks.eq.mockReturnValue({ order: mocks.order })
    mocks.select.mockReturnValue({ eq: mocks.eq })
    mocks.from.mockReturnValue({ select: mocks.select })
    mocks.upload.mockResolvedValue({ error: null })
    mocks.remove.mockResolvedValue({ error: null })
    mocks.storageFrom.mockReturnValue({ upload: mocks.upload, remove: mocks.remove })
    mocks.rpc.mockResolvedValue({ data: 'request-1234', error: null })
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('8f5e4f5a-2e9f-4ee2-a6a6-c0e208c3f43f')
  })

  it('loads the owner request and sends the private document through the RPC', async () => {
    render(<PropertyVerificationPanel propertyId="property-1" userId="user-1" />)
    fireEvent.click(screen.getByRole('button', { name: /solicitar verificación documental/i }))
    await waitFor(() => expect(screen.getByText(/Tipo de documento/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Archivo privado'), {
      target: { files: [new File(['document'], 'titulo.pdf', { type: 'application/pdf' })] },
    })
    fireEvent.click(screen.getByRole('button', { name: /enviar a revisión/i }))

    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('submit_property_verification', expect.objectContaining({
      p_property_id: 'property-1',
      p_document_type: 'ownership_title',
      p_document_path: 'user-1/property-property-1/8f5e4f5a-2e9f-4ee2-a6a6-c0e208c3f43f-titulo.pdf',
    })))
    expect(mocks.upload).toHaveBeenCalledOnce()
    expect(screen.getByText('Solicitud enviada.', { exact: true })).toHaveAttribute('role', 'status')
  })

  it('removes the uploaded file when request registration fails', async () => {
    vi.stubEnv('MODE', 'phase2-dev')
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'private backend detail' } })
    render(<PropertyVerificationPanel propertyId="property-1" userId="user-1" />)
    fireEvent.click(screen.getByRole('button', { name: /solicitar verificación documental/i }))
    await waitFor(() => expect(screen.getByLabelText('Archivo privado')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Archivo privado'), {
      target: { files: [new File(['document'], 'titulo.pdf', { type: 'application/pdf' })] },
    })
    fireEvent.click(screen.getByRole('button', { name: /enviar a revisión/i }))

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith([
      'user-1/property-property-1/8f5e4f5a-2e9f-4ee2-a6a6-c0e208c3f43f-titulo.pdf',
    ]))
    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo enviar/i)
    expect(screen.getByRole('alert')).toHaveTextContent('Código técnico: PGRST202')
    expect(screen.getByRole('alert')).not.toHaveTextContent('private backend detail')
  })

  it('allows a new submission after a previous request was rejected', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        status: 'rejected',
        rejection_reason: 'Documento ilegible',
        created_at: '2026-09-27T10:00:00Z',
      },
      error: null,
    })

    render(<PropertyVerificationPanel propertyId="property-1" userId="user-1" />)
    fireEvent.click(screen.getByRole('button', { name: /solicitar verificación documental/i }))

    expect(await screen.findByText('Documento ilegible')).toBeInTheDocument()
    expect(screen.getByLabelText('Archivo privado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar a revisión/i })).toBeInTheDocument()
  })
})

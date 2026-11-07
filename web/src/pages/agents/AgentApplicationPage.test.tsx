import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentApplicationPage } from './AgentApplicationPage'

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}))

const user = { id: 'applicant-1' } as never

function validFiles() {
  const cv = new File(['%PDF-1.7'], 'cv.pdf', { type: 'application/pdf' })
  const diploma = new File(['%PDF-1.7'], 'diploma.pdf', { type: 'application/pdf' })
  fireEvent.change(screen.getByLabelText('Currículum'), { target: { files: [cv] } })
  fireEvent.change(screen.getByLabelText('Título o comprobante de graduación'), { target: { files: [diploma] } })
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Provincia principal'), { target: { value: 'La Habana' } })
  fireEvent.change(screen.getByLabelText('Título de nivel superior'), { target: { value: 'Licenciatura en Derecho' } })
  validFiles()
}

describe('AgentApplicationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'session-token' } }, error: null })
    vi.stubGlobal('fetch', vi.fn())
  })

  it('requires province, degree and both documents before sending', async () => {
    render(<AgentApplicationPage user={user} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /enviar postulación/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Completa la provincia y la formación')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends multipart data with the authenticated session and shows confirmation', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: 'application-1', status: 'submitted' }), { status: 201 }))
    const { container } = render(<AgentApplicationPage user={user} onBack={vi.fn()} />)
    fillRequiredFields()
    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    const [url, init] = vi.mocked(fetch).mock.calls[0]!
    if (!init) throw new Error('Expected fetch options')
    expect(url).toBe('/api/phase3/agent-applications')
    expect(init.headers).toEqual({ Authorization: 'Bearer session-token' })
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('province')).toBe('La Habana')
    expect((init.body as FormData).get('cv')).toBeInstanceOf(File)
    expect(await screen.findByRole('heading', { name: 'Recibimos tu postulación' })).toBeInTheDocument()
  })

  it('keeps server details private and explains when the feature is disabled', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'secret internal error' }), { status: 404 }))
    const { container } = render(<AgentApplicationPage user={user} onBack={vi.fn()} />)
    fillRequiredFields()
    fireEvent.submit(container.querySelector('form')!)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('todavía no está habilitada')
    expect(alert).not.toHaveTextContent('secret internal error')
  })

  it('explains safe storage and persistence failures without showing upstream details', async () => {
    const { container, unmount } = render(<AgentApplicationPage user={user} onBack={vi.fn()} />)
    fillRequiredFields()
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'document_storage_unavailable', details: 'private upstream detail' }), { status: 503 }))
    fireEvent.submit(container.querySelector('form')!)
    const storageAlert = await screen.findByRole('alert')
    expect(storageAlert).toHaveTextContent('guardar los documentos privados')
    expect(storageAlert).not.toHaveTextContent('private upstream detail')

    unmount()
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'application_persistence_unavailable' }), { status: 503 }))
    const next = render(<AgentApplicationPage user={user} onBack={vi.fn()} />)
    fillRequiredFields()
    fireEvent.submit(next.container.querySelector('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo registrar la postulación')
  })

  it('rejects files above 10 MB before network submission', async () => {
    render(<AgentApplicationPage user={user} onBack={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Provincia principal'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Título de nivel superior'), { target: { value: 'Licenciatura' } })
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' })
    const valid = new File(['%PDF-1.7'], 'degree.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Currículum'), { target: { files: [oversized] } })
    fireEvent.change(screen.getByLabelText('Título o comprobante de graduación'), { target: { files: [valid] } })
    fireEvent.click(screen.getByRole('button', { name: /enviar postulación/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('como máximo 10 MB')
    expect(fetch).not.toHaveBeenCalled()
  })
})

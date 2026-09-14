import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublishPage } from './PublishPage'
import { readCompleteDraft, removeCompleteDraft, saveCompleteDraft } from './completeDraftStorage'

const mocks = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn(), from: vi.fn(), single: vi.fn() }))
vi.mock('./completeDraftStorage', () => ({ readCompleteDraft: vi.fn(), saveCompleteDraft: vi.fn().mockResolvedValue(undefined), removeCompleteDraft: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../shared/hooks/useSEO', () => ({ useSEO: vi.fn() }))
vi.mock('../../shared/lib/supabaseClient', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'A' } } }), getSession: async () => ({ data: { session: null } }) },
  from: mocks.from,
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://images/${path}` } }) }) },
} }))
const saved = { formData: { contactName: 'Ana', contactPhone: '+525512345678', description: 'Mi casa' }, images: [{ dataUrl: 'data:image/webp;base64,YQ==', name: 'a.webp', size: 1 }, { dataUrl: 'data:image/webp;base64,Yg==', name: 'b.webp', size: 1 }], step: 8, existingAmenities: [] }

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('alert', vi.fn())
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  vi.mocked(readCompleteDraft).mockResolvedValue(saved)
  mocks.remove.mockResolvedValue({ error: null })
  mocks.single.mockResolvedValue({ data: { id: 'new-property' }, error: null })
  mocks.from.mockImplementation((table: string) => table === 'profiles'
    ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
    : { insert: () => ({ select: () => ({ single: mocks.single }) }) })
})

describe('publication integrity', () => {
  it('restores the structured exchange fields for a swap draft', async () => {
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({
      formData: {
        operation: 'permuta',
        exchangePreferences: {
          propertyType: 'casa',
          province: 'Matanzas',
          municipality: 'Cárdenas',
          minBedrooms: 3,
          minAreaM2: '90',
          notes: 'Con patio y espacio para ampliar.',
          cashAdjustment: 'negotiable',
          cashAmountUsd: '',
        },
      },
      images: [],
      step: 7,
      existingAmenities: [],
    })

    render(<PublishPage userId="A" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: /qué buscas a cambio/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tipo de inmueble que busca/i })).toHaveTextContent('Casa')
    expect(screen.getByRole('button', { name: /diferencia de dinero/i })).toHaveTextContent('Negociable')
    expect(screen.getByLabelText(/dormitorios mín/i)).toHaveValue(3)
    expect(screen.getByLabelText(/área mín/i)).toHaveValue(90)
    expect(screen.getByLabelText(/otros detalles/i)).toHaveValue('Con patio y espacio para ampliar.')
  })

  it('does not persist partial photos or remove draft, then retries all photos successfully', async () => {
    mocks.upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('offline') })
    const { container } = render(<PublishPage userId="A" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)
    await screen.findByDisplayValue('Ana')
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining('No se subieron todas las fotos')))
    expect(mocks.from).not.toHaveBeenCalledWith('properties')
    expect(removeCompleteDraft).not.toHaveBeenCalled()
    expect(saveCompleteDraft).toHaveBeenCalledWith('A', expect.objectContaining({ images: saved.images, step: 8 }), undefined)
    mocks.upload.mockResolvedValue({ error: null })
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(removeCompleteDraft).toHaveBeenCalledWith('A', undefined))
    expect(mocks.upload).toHaveBeenCalledTimes(4)
    expect(mocks.single).toHaveBeenCalledTimes(1)
  })
})

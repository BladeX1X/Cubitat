import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublishPage } from './PublishPage'
import { readCompleteDraft, removeCompleteDraft, saveCompleteDraft } from './completeDraftStorage'
import { normalizePropertyImageReference } from '../../modules/properties/utils/images'

const mocks = vi.hoisted(() => ({ upload: vi.fn(), uploadPropertyImage: vi.fn(), remove: vi.fn(), from: vi.fn(), single: vi.fn(), insert: vi.fn(), update: vi.fn(), updateEq: vi.fn(), updateResult: { data: { id: 'property-1' } as { id: string } | null, error: null as unknown }, authGetUser: vi.fn(), compressImage: vi.fn(), getEditableProperty: vi.fn(), createImagePreview: vi.fn() }))
vi.mock('./completeDraftStorage', () => ({ readCompleteDraft: vi.fn(), saveCompleteDraft: vi.fn().mockResolvedValue(undefined), removeCompleteDraft: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../shared/hooks/useSEO', () => ({ useSEO: vi.fn() }))
vi.mock('./compressPublicationImage', () => ({ compressPublicationImage: mocks.compressImage }))
vi.mock('./uploadPropertyImage', () => ({ uploadPropertyImage: mocks.uploadPropertyImage }))
vi.mock('./editablePropertyRepository', () => ({ getEditableProperty: mocks.getEditableProperty }))
vi.mock('../../modules/properties/utils/privateImagePreviews', () => ({
  createOwnedPropertyImagePreview: mocks.createImagePreview,
  isOwnedPropertyImageReference: (image: string, ownerId: string) => image.includes(`/property_images/${ownerId}/`),
}))
vi.mock('../../shared/lib/supabaseClient', () => ({ supabase: {
  auth: { getUser: mocks.authGetUser, getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) },
  from: mocks.from,
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove, getPublicUrl: (path: string) => ({ data: { publicUrl: `${window.location.origin}/api/supabase/storage/v1/object/public/property_images/${path}` } }) }) },
} }))
const saved = { formData: { contactName: 'Ana', contactPhone: '+525512345678', description: 'Mi casa' }, images: [{ dataUrl: 'data:image/webp;base64,YQ==', name: 'a.webp', size: 1 }, { dataUrl: 'data:image/webp;base64,Yg==', name: 'b.webp', size: 1 }], step: 8, existingAmenities: [] }

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('alert', vi.fn())
  vi.stubGlobal('confirm', vi.fn(() => true))
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  vi.mocked(readCompleteDraft).mockResolvedValue(saved)
  mocks.compressImage.mockResolvedValue({ dataUrl: 'data:image/webp;base64,QQ==', size: 1 })
  mocks.uploadPropertyImage.mockImplementation(async () => `A/${crypto.randomUUID()}.webp`)
  mocks.getEditableProperty.mockResolvedValue({ data: null, error: null })
  mocks.createImagePreview.mockResolvedValue({ previewUrl: 'blob:owner-photo-preview', size: 3072 })
  mocks.authGetUser.mockResolvedValue({ data: { user: { id: 'A' } }, error: null })
  mocks.remove.mockResolvedValue({ error: null })
  mocks.single.mockResolvedValue({ data: { id: 'new-property' }, error: null })
  mocks.insert.mockReset()
  mocks.update.mockResolvedValue({ error: null })
  mocks.updateEq.mockReset()
  mocks.updateResult = { data: { id: 'property-1' }, error: null }
  mocks.from.mockImplementation((table: string) => table === 'profiles'
    ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
    : table === 'properties'
      ? { insert: (payload: unknown) => { mocks.insert(payload); return { select: () => ({ single: mocks.single }) } }, update: (payload: unknown) => { mocks.update(payload); const query = { eq: (column: string, value: string) => { mocks.updateEq(column, value); return query }, select: () => ({ maybeSingle: async () => mocks.updateResult }) }; return query } }
      : { insert: () => ({ select: () => ({ single: mocks.single }) }) })
})

describe('publication integrity', () => {
  it('asks before a new property replaces an existing local draft', async () => {
    render(<PublishPage {...{ userId: 'A', onBack: vi.fn(), onSubmitSuccess: vi.fn(), resumeDraft: false }} />)

    expect(await screen.findByRole('dialog')).toHaveTextContent(/anuncio sin terminar/i)
    expect(screen.queryByDisplayValue('Ana')).not.toBeInTheDocument()
    expect(saveCompleteDraft).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /continuar borrador/i }))

    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument()
  })

  it('removes the local draft only after the user chooses to start a new property', async () => {
    render(<PublishPage {...{ userId: 'A', onBack: vi.fn(), onSubmitSuccess: vi.fn(), resumeDraft: false }} />)

    fireEvent.click(await screen.findByRole('button', { name: /empezar una propiedad nueva/i }))

    expect(removeCompleteDraft).toHaveBeenCalledWith('A')
    expect(await screen.findByRole('heading', { name: 'Publicar propiedad' })).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Ana')).not.toBeInTheDocument()
  })

  it('opens a clean new form when there is no saved draft', async () => {
    vi.mocked(readCompleteDraft).mockResolvedValueOnce(null)
    render(<PublishPage {...{ userId: 'A', onBack: vi.fn(), onSubmitSuccess: vi.fn(), resumeDraft: false }} />)

    expect(await screen.findByRole('heading', { name: 'Publicar propiedad' })).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Ana')).not.toBeInTheDocument()
    expect(removeCompleteDraft).not.toHaveBeenCalled()
  })

  it('offers a retry when the saved draft cannot be loaded', async () => {
    vi.mocked(readCompleteDraft).mockRejectedValueOnce(new Error('temporary storage failure'))
    render(<PublishPage userId="A" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo recuperar el borrador/i)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument()
  })

  it('keeps the uploader free of conversion details, including while photos are processing', async () => {
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({ ...saved, step: 6 })
    let finishCompression!: (image: { dataUrl: string; size: number }) => void
    mocks.compressImage.mockReturnValueOnce(new Promise(resolve => { finishCompression = resolve }))

    render(<PublishPage userId="A" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)

    expect(await screen.findByText('Arrastra imágenes o búscalas')).toBeInTheDocument()
    expect(screen.queryByText(/convertidor webp/i)).not.toBeInTheDocument()
    const dropzone = screen.getByRole('group', { name: 'Cargar fotos' })
    await act(async () => {
      fireEvent.drop(dropzone, { dataTransfer: { files: [new File(['photo'], 'selected.png', { type: 'image/png' })] } })
      await Promise.resolve()
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Preparando las fotos…')
    expect(screen.queryByText(/comprimiendo|convirtiendo|webp/i)).not.toBeInTheDocument()
    await act(async () => finishCompression({ dataUrl: 'data:image/webp;base64,QQ==', size: 1 }))
  })

  it('loads an existing owner photo as an authenticated preview without replacing its saved URL', async () => {
    const ownerId = '11111111-1111-4111-8111-111111111111'
    const photoUrl = `${window.location.origin}/api/supabase/storage/v1/object/public/property_images/${ownerId}/22222222-2222-4222-8222-222222222222.webp`
    mocks.authGetUser.mockResolvedValueOnce({ data: { user: { id: ownerId } }, error: null })
    mocks.getEditableProperty.mockResolvedValueOnce({ data: {
      images: [photoUrl],
      location: 'Playa, La Habana',
      operation: 'venta',
      property_type: 'casa',
      description: 'Casa de prueba',
      price_usd: 68000,
      coordinates: { latitude: 23.1, longitude: -82.4 },
    }, error: null })
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({
      ...saved,
      formData: { ...saved.formData, contactName: '', contactPhone: '' },
      images: [{ dataUrl: photoUrl, name: 'existing-0.webp', size: 0 }],
      step: 6,
    })

    render(<PublishPage userId={ownerId} editPropertyId="property-1" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)

    const photo = await screen.findByRole('group', { name: 'Foto 1: existing-0.webp' })
    await waitFor(() => expect(photo).toHaveTextContent('3.0 KB'))
    expect(mocks.createImagePreview).toHaveBeenCalledWith(normalizePropertyImageReference(photoUrl), ownerId)
    expect(photo.querySelector('div')?.getAttribute('style')).toContain('blob:owner-photo-preview')
    expect(saveCompleteDraft).toHaveBeenCalledWith(ownerId, expect.objectContaining({
      images: [expect.objectContaining({ dataUrl: normalizePropertyImageReference(photoUrl), name: 'existing-0.webp', size: 3072 })],
    }), 'property-1')
  })

  it('keeps server contact and gallery data when an unmodified local edit snapshot is stale', async () => {
    const ownerId = '11111111-1111-4111-8111-111111111111'
    const photoUrl = `${window.location.origin}/api/supabase/storage/v1/object/property_images/${ownerId}/22222222-2222-4222-8222-222222222222.webp`
    mocks.authGetUser.mockResolvedValueOnce({ data: { user: { id: ownerId } }, error: null })
    mocks.getEditableProperty.mockResolvedValueOnce({ data: {
      images: [photoUrl],
      location: 'Playa, La Habana',
      operation: 'venta',
      property_type: 'casa',
      description: 'Casa de prueba',
      price_usd: 68000,
      contact_info: { name: 'Alejandro', phone: '+535637636644' },
    }, error: null })
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({
      formData: { ...saved.formData, contactName: '', contactPhone: '' },
      images: [],
      step: 8,
      existingAmenities: [],
      edited: false,
    })

    render(<PublishPage userId={ownerId} editPropertyId="property-1" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)

    expect(await screen.findByDisplayValue('Alejandro')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+535637636644')).toBeInTheDocument()
    await waitFor(() => expect(saveCompleteDraft).toHaveBeenLastCalledWith(ownerId, expect.objectContaining({
      formData: expect.objectContaining({ contactName: 'Alejandro', contactPhone: '+535637636644' }),
      images: [expect.objectContaining({ dataUrl: normalizePropertyImageReference(photoUrl) })],
    }), 'property-1'))
    expect(mocks.createImagePreview).toHaveBeenCalledWith(photoUrl, ownerId)
  })

  it('restores deliberate edits from a dirty local edit snapshot', async () => {
    const ownerId = '11111111-1111-4111-8111-111111111111'
    const photoUrl = `${window.location.origin}/api/supabase/storage/v1/object/property_images/${ownerId}/22222222-2222-4222-8222-222222222222.webp`
    mocks.authGetUser.mockResolvedValueOnce({ data: { user: { id: ownerId } }, error: null })
    mocks.getEditableProperty.mockResolvedValueOnce({ data: {
      images: [photoUrl],
      location: 'Playa, La Habana',
      operation: 'venta',
      property_type: 'casa',
      description: 'Casa de prueba',
      price_usd: 68000,
      contact_info: { name: 'Alejandro', phone: '+535637636644' },
    }, error: null })
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({
      formData: { ...saved.formData, contactName: '', contactPhone: '' },
      images: [],
      step: 8,
      existingAmenities: [],
      edited: true,
    })

    render(<PublishPage userId={ownerId} editPropertyId="property-1" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)

    const contactName = await screen.findByPlaceholderText('Ej: Alejandro Gómez')
    expect(contactName).toHaveValue('')
    await waitFor(() => expect(saveCompleteDraft).toHaveBeenLastCalledWith(ownerId, expect.objectContaining({
      formData: expect.objectContaining({ contactName: '', contactPhone: '' }),
      images: [],
      edited: true,
    }), 'property-1'))
  })

  it('offers a retry and recovers an existing photo when its first preview download fails', async () => {
    const ownerId = '11111111-1111-4111-8111-111111111111'
    const photoUrl = `${window.location.origin}/api/supabase/storage/v1/object/property_images/${ownerId}/22222222-2222-4222-8222-222222222222.webp`
    mocks.authGetUser.mockResolvedValueOnce({ data: { user: { id: ownerId } }, error: null })
    mocks.getEditableProperty.mockResolvedValueOnce({ data: {
      images: [photoUrl],
      operation: 'venta',
      property_type: 'casa',
    }, error: null })
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({
      ...saved,
      images: [{ dataUrl: photoUrl, name: 'existing-0.webp', size: 0 }],
      step: 6,
      edited: false,
    })
    mocks.createImagePreview
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ previewUrl: 'blob:owner-photo-preview-retry', size: 3072 })
    const revokePreview = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

    render(<PublishPage userId={ownerId} editPropertyId="property-1" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)

    const photo = await screen.findByRole('group', { name: 'Foto 1: existing-0.webp' })
    const retry = await screen.findByRole('button', { name: 'Reintentar carga de Foto 1' })
    expect(photo).toHaveTextContent('No se pudo cargar esta foto')
    fireEvent.click(retry)

    await waitFor(() => expect(photo).toHaveTextContent('3.0 KB'))
    expect(mocks.createImagePreview).toHaveBeenCalledTimes(2)
    expect(photo.querySelector('div')?.getAttribute('style')).toContain('blob:owner-photo-preview-retry')
    expect(screen.queryByRole('button', { name: 'Reintentar carga de Foto 1' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar existing-0.webp' }))
    expect(revokePreview).toHaveBeenCalledWith('blob:owner-photo-preview-retry')
  })

  it('keeps existing photo URLs and sends the edited gallery for review when saving', async () => {
    const ownerId = '11111111-1111-4111-8111-111111111111'
    const existingImages = [
      `https://bknwerqbbysveehcdmzr.supabase.co/storage/v1/object/public/property_images/${ownerId}/22222222-2222-4222-8222-222222222222.webp`,
      `https://bknwerqbbysveehcdmzr.supabase.co/storage/v1/object/public/property_images/${ownerId}/33333333-3333-4333-8333-333333333333.webp`,
    ]
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: ownerId } }, error: null })
    mocks.getEditableProperty.mockResolvedValueOnce({ data: {
      images: existingImages,
      location: 'Playa, La Habana',
      operation: 'venta',
      property_type: 'casa',
      description: 'Casa de prueba',
      price_usd: 68000,
      contact_info: { name: 'Ana', phone: '+525512345678' },
      coordinates: { latitude: 23.1, longitude: -82.4 },
    }, error: null })
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({
      ...saved,
      images: existingImages.map((dataUrl, index) => ({ dataUrl, name: `existing-${index}.webp`, size: 3072 })),
      step: 8,
    })
    const { container } = render(<PublishPage userId={ownerId} editPropertyId="property-1" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)
    await screen.findByDisplayValue('Ana')

    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce())
    const payload = mocks.update.mock.calls[0][0]
    const privateImageUrls = existingImages.map(image => image.replace('/object/public/', '/object/').replace('https://bknwerqbbysveehcdmzr.supabase.co/storage/v1/object/', `${window.location.origin}/api/supabase/storage/v1/object/`))
    expect(payload).not.toHaveProperty('user_id')
    expect(payload.images).toEqual(privateImageUrls)
    expect(payload.cover_image).toBe(privateImageUrls[0])
    expect(payload.status).toBe('pending_review')
    expect(payload.coordinates).toEqual({ latitude: 23.1, longitude: -82.4 })
    expect(mocks.updateEq).toHaveBeenNthCalledWith(1, 'id', 'property-1')
    expect(mocks.updateEq).toHaveBeenNthCalledWith(2, 'user_id', ownerId)
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('uploads a newly added photo while preserving existing gallery photos on edit', async () => {
    const ownerId = '11111111-1111-4111-8111-111111111111'
    const existingPhoto = `https://bknwerqbbysveehcdmzr.supabase.co/storage/v1/object/public/property_images/${ownerId}/22222222-2222-4222-8222-222222222222.webp`
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: ownerId } }, error: null })
    mocks.uploadPropertyImage.mockImplementation(async () => `${ownerId}/22222222-2222-4222-8222-222222222222.webp`)
    mocks.getEditableProperty.mockResolvedValueOnce({ data: {
      images: [existingPhoto],
      location: 'Playa, La Habana',
      operation: 'venta',
      property_type: 'casa',
      description: 'Casa de prueba',
      price_usd: 68000,
      contact_info: { name: 'Ana', phone: '+525512345678' },
    }, error: null })
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({
      ...saved,
      images: [
        { dataUrl: existingPhoto, name: 'existing-0.webp', size: 3072 },
        { dataUrl: 'data:image/webp;base64,QQ==', name: 'new.webp', size: 1 },
      ],
      step: 8,
    })
    const { container } = render(<PublishPage userId={ownerId} editPropertyId="property-1" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)
    await screen.findByDisplayValue('Ana')

    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce())
    const payload = mocks.update.mock.calls[0][0]
    expect(payload).not.toHaveProperty('user_id')
    expect(payload.images).toHaveLength(2)
    expect(payload.images[0]).toBe(existingPhoto.replace('/object/public/', '/object/').replace('https://bknwerqbbysveehcdmzr.supabase.co/storage/v1/object/', `${window.location.origin}/api/supabase/storage/v1/object/`))
    expect(payload.images[1]).toMatch(new RegExp(`^${window.location.origin}/api/supabase/storage/v1/object/property_images/${ownerId}/[0-9a-f-]+\\.webp$`, 'i'))
    expect(payload.cover_image).toBe(payload.images[0])
    expect(payload.status).toBe('pending_review')
    expect(mocks.uploadPropertyImage).toHaveBeenCalledOnce()
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('cleans newly uploaded photos after a definite database permission rejection', async () => {
    const ownerId = '11111111-1111-4111-8111-111111111111'
    const existingPhoto = `https://bknwerqbbysveehcdmzr.supabase.co/storage/v1/object/public/property_images/${ownerId}/22222222-2222-4222-8222-222222222222.webp`
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: ownerId } }, error: null })
    mocks.uploadPropertyImage.mockResolvedValue(`${ownerId}/44444444-4444-4444-8444-444444444444.webp`)
    mocks.getEditableProperty.mockResolvedValueOnce({ data: {
      images: [existingPhoto],
      location: 'Playa, La Habana',
      operation: 'venta',
      property_type: 'casa',
      description: 'Casa de prueba',
      contact_info: { name: 'Ana', phone: '+525512345678' },
    }, error: null })
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({
      ...saved,
      images: [
        { dataUrl: existingPhoto, name: 'existing.webp', size: 3072 },
        { dataUrl: 'data:image/webp;base64,QQ==', name: 'new.webp', size: 1 },
      ],
      step: 8,
    })
    mocks.updateResult = { data: null, error: { code: '42501' } }
    const { container } = render(<PublishPage userId={ownerId} editPropertyId="property-1" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)
    await screen.findByDisplayValue('Ana')

    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith([`${ownerId}/44444444-4444-4444-8444-444444444444.webp`]))
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringMatching(/cuenta que la publicó/i))
    expect(globalThis.fetch).not.toHaveBeenCalledWith('/api/ai-moderate', expect.anything())
  })

  it('includes the authenticated owner when creating a new property', async () => {
    const { container } = render(<PublishPage userId="A" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)
    await screen.findByDisplayValue('Ana')

    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => expect(mocks.insert).toHaveBeenCalledOnce())
    const payload = mocks.insert.mock.calls[0][0]
    expect(payload.user_id).toBe('A')
    expect(payload.status).toBe('pending_review')
    expect(mocks.from).toHaveBeenCalledWith('properties')
  })

  it('scopes property edits to the authenticated owner and explains when RLS returns no row', async () => {
    const ownerId = '11111111-1111-4111-8111-111111111111'
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: ownerId } }, error: null })
    mocks.updateResult = { data: null, error: null }
    mocks.getEditableProperty.mockResolvedValueOnce({ data: {
      images: [], location: 'Playa, La Habana', operation: 'venta', property_type: 'casa',
      description: 'Casa de prueba', price_usd: 68000,
      contact_info: { name: 'Ana', phone: '+525512345678' },
    }, error: null })
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({ ...saved, images: [], step: 8 })
    const { container } = render(<PublishPage userId={ownerId} editPropertyId="property-1" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)
    await screen.findByDisplayValue('Ana')

    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith(expect.stringMatching(/cuenta que la publicó/i)))
    expect(globalThis.fetch).not.toHaveBeenCalledWith('/api/ai-moderate', expect.anything())
  })

  it('accepts dropped photos through the same 20-photo limit as file selection', async () => {
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({ ...saved, step: 6 })
    render(<PublishPage userId="A" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)
    const dropzone = await screen.findByRole('group', { name: 'Cargar fotos' })
    const extraPhotos = Array.from({ length: 19 }, (_, index) => new File(['photo'], `photo-${index}.png`, { type: 'image/png' }))

    fireEvent.drop(dropzone, { dataTransfer: { files: extraPhotos } })

    expect(globalThis.alert).toHaveBeenCalledWith('Solo puedes subir un máximo de 20 imágenes.')
  })

  it('does not start a second photo batch while the first is compressing', async () => {
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({ ...saved, images: [], step: 6 })
    let finishCompression!: (image: { dataUrl: string; size: number }) => void
    mocks.compressImage.mockReturnValueOnce(new Promise(resolve => { finishCompression = resolve }))
    render(<PublishPage userId="A" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)
    const dropzone = await screen.findByRole('group', { name: 'Cargar fotos' })
    const firstPhoto = new File(['a'], 'first.png', { type: 'image/png' })
    const secondPhoto = new File(['b'], 'second.png', { type: 'image/png' })

    await act(async () => {
      fireEvent.drop(dropzone, { dataTransfer: { files: [firstPhoto] } })
      await Promise.resolve()
    })
    await waitFor(() => expect(mocks.compressImage).toHaveBeenCalledTimes(1))
    await act(async () => fireEvent.drop(dropzone, { dataTransfer: { files: [secondPhoto] } }))

    expect(mocks.compressImage).toHaveBeenCalledTimes(1)
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringMatching(/espera.*procesamiento de las fotos/i))
    await act(async () => finishCompression({ dataUrl: 'data:image/webp;base64,QQ==', size: 1 }))
    expect(await screen.findByRole('group', { name: 'Foto 1: first.webp' })).toBeInTheDocument()
  })

  it('lets the advertiser reorder photos and change which image becomes the cover', async () => {
    vi.mocked(readCompleteDraft).mockResolvedValueOnce({ ...saved, step: 6 })
    render(<PublishPage userId="A" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)

    expect(await screen.findByRole('group', { name: 'Foto 1: a.webp' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mover a.webp después' }))

    expect(screen.getByRole('group', { name: 'Foto 1: b.webp' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Foto 2: a.webp' })).toBeInTheDocument()
    await waitFor(() => expect(saveCompleteDraft).toHaveBeenLastCalledWith('A', expect.objectContaining({ images: [saved.images[1], saved.images[0]] }), undefined))
  })

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
    mocks.uploadPropertyImage.mockResolvedValueOnce('A/11111111-1111-4111-8111-111111111111.webp').mockRejectedValueOnce(new Error('offline'))
    const { container } = render(<PublishPage userId="A" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)
    await screen.findByDisplayValue('Ana')
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining('No se subieron todas las fotos')))
    expect(mocks.from).not.toHaveBeenCalledWith('properties')
    expect(removeCompleteDraft).not.toHaveBeenCalled()
    expect(saveCompleteDraft).toHaveBeenCalledWith('A', expect.objectContaining({ images: saved.images, step: 8 }), undefined)
    mocks.uploadPropertyImage.mockImplementation(async () => `A/${crypto.randomUUID()}.webp`)
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(removeCompleteDraft).toHaveBeenCalledWith('A', undefined))
    expect(mocks.uploadPropertyImage).toHaveBeenCalledTimes(4)
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.single).toHaveBeenCalledTimes(1)
  })

  it('does not show internal database error details to the advertiser', async () => {
    mocks.uploadPropertyImage.mockImplementation(async () => `A/${crypto.randomUUID()}.webp`)
    mocks.single.mockResolvedValueOnce({ data: null, error: new Error('DATABASE private schema detail') })
    const { container } = render(<PublishPage userId="A" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)
    await screen.findByDisplayValue('Ana')

    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith('No se pudo guardar la propiedad. Comprueba tu conexión e inténtalo de nuevo.'))
    expect(globalThis.alert).not.toHaveBeenCalledWith(expect.stringContaining('private schema detail'))
  })

  it.each([
    ['throws during session verification', () => mocks.authGetUser.mockRejectedValueOnce(new Error('offline'))],
    ['returns a session verification error', () => mocks.authGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('offline') })],
  ])('explains when publishing cannot verify the session because it %s', async (_caseName, failSession) => {
    const { container } = render(<PublishPage userId="A" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)
    await screen.findByDisplayValue('Ana')
    failSession()

    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith(expect.stringMatching(/no se pudo confirmar tu sesión/i)))
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalledWith('properties')
  })

  it('keeps the form usable if loading the optional seller contact fails', async () => {
    mocks.authGetUser.mockRejectedValueOnce(new Error('offline'))
    render(<PublishPage userId="A" onBack={vi.fn()} onSubmitSuccess={vi.fn()} />)

    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument()
    expect(globalThis.alert).not.toHaveBeenCalled()
  })

  it('preserves the saved draft snapshot before leaving without saving', async () => {
    const onBack = vi.fn()
    const { container } = render(<PublishPage userId="A" onBack={onBack} onSubmitSuccess={vi.fn()} />)
    const contactName = await screen.findByDisplayValue('Ana')
    fireEvent.change(contactName, { target: { value: 'Cambio temporal' } })
    await waitFor(() => expect(saveCompleteDraft).toHaveBeenCalledWith('A', expect.objectContaining({ formData: expect.objectContaining({ contactName: 'Cambio temporal' }) }), undefined))
    const exitButton = await screen.findByRole('button', { name: 'Salir sin guardar' })
    await waitFor(() => expect(exitButton).toBeEnabled())
    fireEvent.click(exitButton)

    expect(globalThis.confirm).toHaveBeenCalledWith(expect.stringMatching(/anuncio publicado no se modificará.*se descartarán/i))
    await waitFor(() => expect(saveCompleteDraft).toHaveBeenLastCalledWith('A', saved, undefined))
    expect(removeCompleteDraft).not.toHaveBeenCalledWith('A', undefined)
    expect(onBack).toHaveBeenCalledOnce()
    expect(container.querySelector('form')).not.toBeNull()
    expect(mocks.from).not.toHaveBeenCalledWith('properties')
  })

  it('discards a changed property edit without writing to the published property', async () => {
    const onBack = vi.fn()
    mocks.getEditableProperty.mockResolvedValueOnce({
      data: {
        operation: 'venta',
        property_type: 'casa',
        description: 'Mi casa',
        contact_info: { name: 'Ana', phone: '+525512345678' },
        images: [],
      },
      error: null,
    })
    render(<PublishPage userId="A" editPropertyId="property-1" onBack={onBack} onSubmitSuccess={vi.fn()} />)

    const contactName = await screen.findByDisplayValue('Ana')
    fireEvent.change(contactName, { target: { value: 'Cambio temporal QA' } })
    const exitButton = await screen.findByRole('button', { name: 'Salir sin guardar' })
    await waitFor(() => expect(exitButton).toBeEnabled())
    fireEvent.click(exitButton)

    expect(globalThis.confirm).toHaveBeenCalledWith(expect.stringMatching(/anuncio publicado no se modificará.*se descartarán/i))
    await waitFor(() => expect(removeCompleteDraft).toHaveBeenCalledWith('A', 'property-1'))
    expect(onBack).toHaveBeenCalledOnce()
    expect(mocks.from).not.toHaveBeenCalledWith('properties')
  })

  it('keeps the editor and draft when exit confirmation is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    const onBack = vi.fn()
    render(<PublishPage userId="A" onBack={onBack} onSubmitSuccess={vi.fn()} />)
    await screen.findByDisplayValue('Ana')
    fireEvent.click(await screen.findByRole('button', { name: 'Salir sin guardar' }))

    expect(removeCompleteDraft).not.toHaveBeenCalled()
    expect(onBack).not.toHaveBeenCalled()
  })
})

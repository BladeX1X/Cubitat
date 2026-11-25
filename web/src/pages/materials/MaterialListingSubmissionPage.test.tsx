import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MaterialListingSubmissionPage } from './MaterialListingSubmissionPage'

const materialMocks = vi.hoisted(() => ({
  compressPhoto: vi.fn(),
  create: vi.fn(),
  createPreviews: vi.fn(),
  fetchMine: vi.fn(),
  removePhotos: vi.fn(),
  update: vi.fn(),
  uploadPhotos: vi.fn(),
}))

vi.mock('../../modules/materials/materialRepository', () => ({
  createMaterialListing: materialMocks.create,
  createOwnedMaterialPhotoPreviews: materialMocks.createPreviews,
  fetchMyMaterialListings: materialMocks.fetchMine,
  removeUnattachedMaterialPhotos: materialMocks.removePhotos,
  updateMaterialListing: materialMocks.update,
  uploadMaterialPhotos: materialMocks.uploadPhotos,
}))

vi.mock('../../shared/lib/catalogPhotos', () => ({
  compressCatalogPhoto: materialMocks.compressPhoto,
}))
vi.mock('../publish/PublicationLocationField', () => ({
  PublicationLocationField: ({ onCoordinatesChange }: { onCoordinatesChange: (latitude: number, longitude: number) => void }) => <button type="button" onClick={() => onCoordinatesChange(20.01234, -75.81234)}>Marcar punto</button>,
}))

async function advanceMaterialTo(targetStep: number) {
  const labels = ['Producto', 'Ubicación', 'Precio y detalles', 'Fotos', 'Contacto']
  const currentHeading = screen.getByRole('heading', { level: 2 }).textContent ?? ''
  let current = labels.indexOf(currentHeading) + 1
  if (current < 1) current = 1
  while (current < targetStep) {
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: labels[current] })).toBeVisible())
    current += 1
  }
  while (current > targetStep) {
    fireEvent.click(screen.getByRole('button', { name: 'Paso anterior' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: labels[current - 2] })).toBeVisible())
    current -= 1
  }
}

async function submitMaterial() {
  await advanceMaterialTo(5)
  fireEvent.submit(document.querySelector('form')!)
}

describe('MaterialListingSubmissionPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  beforeEach(() => {
    vi.clearAllMocks()
    materialMocks.fetchMine.mockResolvedValue([])
    materialMocks.createPreviews.mockResolvedValue({ photos: [], unavailableCount: 0 })
    materialMocks.compressPhoto.mockImplementation(async (file: File) => new File([file], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }))
    materialMocks.create.mockResolvedValue('listing-qa')
    materialMocks.uploadPhotos.mockResolvedValue(['owner/listing/photo-1.webp', 'owner/listing/photo-2.webp'])
    materialMocks.update.mockResolvedValue(undefined)
    materialMocks.removePhotos.mockResolvedValue(undefined)
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:material-preview'), revokeObjectURL: vi.fn() })
  })

  it('requires a product name before advancing from the first step', () => {
    render(<MaterialListingSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByRole('heading', { level: 2, name: /^Producto$/ })).toBeVisible()
    expect(screen.getByLabelText('Nombre del producto')).toBeInvalid()
  })

  it('prepares a selected batch as WebP, previews it and saves every photo in order', async () => {
    render(<MaterialListingSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Material de prueba QA' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Descripción de prueba suficientemente larga para el anuncio.' } })
    await advanceMaterialTo(4)
    fireEvent.change(screen.getByLabelText(/Fotos del producto/), { target: { files: [
      new File(['one'], 'producto-1.jpg', { type: 'image/jpeg' }),
      new File(['two'], 'producto-2.png', { type: 'image/png' }),
    ] } })

    expect(await screen.findByText('Preparando tus fotos…')).toBeInTheDocument()
    expect(await screen.findByText('2 de 10 fotos. La primera será la portada del anuncio.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(2))
    expect(materialMocks.compressPhoto).toHaveBeenCalledTimes(2)

    await submitMaterial()
    await waitFor(() => expect(materialMocks.uploadPhotos).toHaveBeenCalledWith('listing-qa', [
      expect.objectContaining({ name: 'producto-1.webp', type: 'image/webp' }),
      expect.objectContaining({ name: 'producto-2.webp', type: 'image/webp' }),
    ], 0))
    expect(materialMocks.update).toHaveBeenCalledWith('listing-qa', expect.objectContaining({
      photoPaths: ['owner/listing/photo-1.webp', 'owner/listing/photo-2.webp'],
    }))
    expect(await screen.findByRole('heading', { name: 'Anuncio enviado a revisión' })).toBeInTheDocument()
  })

  it('saves the selected coordinates with the material listing', async () => {
    render(<MaterialListingSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Material con ubicación QA' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'Santiago de Cuba' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Descripción de prueba con más de veinte caracteres para guardar.' } })
    await advanceMaterialTo(2)
    fireEvent.click(screen.getByRole('button', { name: 'Marcar punto' }))
    await submitMaterial()

    await waitFor(() => expect(materialMocks.create).toHaveBeenCalledWith(expect.objectContaining({ coordinates: { latitude: 20.01234, longitude: -75.81234 } }), expect.any(String)))
    await waitFor(() => expect(materialMocks.update).toHaveBeenCalledWith('listing-qa', expect.objectContaining({ coordinates: { latitude: 20.01234, longitude: -75.81234 } })))
  })

  it('shows signed previews for the owner photos already saved on the listing', async () => {
    const photoPath = '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webp'
    const listingId = '22222222-2222-4222-8222-222222222222'
    const signedUrl = 'https://example.supabase.co/storage/v1/object/sign/material-listings/photo.webp?token=temporary'
    materialMocks.fetchMine.mockResolvedValue([{
      id: listingId, title: 'Anuncio con fotos guardadas', category: 'cemento',
      description: 'Descripción suficientemente larga para editar este anuncio.',
      province: 'La Habana', availability: 'available', price: null, currency: 'USD',
      phone: null, whatsapp: null, photoPaths: [photoPath], status: 'pending_review',
    }])
    materialMocks.createPreviews.mockResolvedValue({ photos: [{ path: photoPath, url: signedUrl }], unavailableCount: 0 })

    render(<MaterialListingSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} listingId={listingId} />)

    await screen.findByRole('heading', { name: 'Edita tu anuncio' })
    await advanceMaterialTo(4)
    const image = await screen.findByRole('img', { name: 'Fotos del producto, foto 1' })
    expect(image).toHaveAttribute('src', signedUrl)
    expect(materialMocks.createPreviews).toHaveBeenCalledWith(listingId, [photoPath])
  })

  it('does not submit while the selected photos are still being prepared', async () => {
    let resolveCompression!: (photo: File) => void
    materialMocks.compressPhoto.mockReturnValueOnce(new Promise<File>((resolve) => { resolveCompression = resolve }))
    render(<MaterialListingSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Material de prueba QA' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Descripción de prueba suficientemente larga para el anuncio.' } })
    await advanceMaterialTo(4)
    fireEvent.change(screen.getByLabelText(/Fotos del producto/), { target: { files: [new File(['one'], 'producto.jpg', { type: 'image/jpeg' })] } })

    const submit = screen.getByRole('button', { name: 'Continuar' })
    expect(submit).toBeDisabled()
    fireEvent.submit(submit.closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('Espera a que terminen de prepararse las fotos antes de enviar.')
    expect(materialMocks.create).not.toHaveBeenCalled()
    resolveCompression(new File(['one'], 'producto.webp', { type: 'image/webp' }))
  })

  it('adds no partial batch when preparation fails and lets the user retry it', async () => {
    materialMocks.compressPhoto
      .mockImplementationOnce(async (file: File) => new File([file], 'producto-1.webp', { type: 'image/webp' }))
      .mockRejectedValueOnce(new Error('CATALOG_PHOTO_COMPRESSION_FAILED'))
    render(<MaterialListingSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Material de prueba QA' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Descripción de prueba suficientemente larga para el anuncio.' } })
    await advanceMaterialTo(4)
    fireEvent.change(screen.getByLabelText(/Fotos del producto/), { target: { files: [
      new File(['one'], 'producto-1.jpg', { type: 'image/jpeg' }),
      new File(['two'], 'producto-2.png', { type: 'image/png' }),
    ] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron preparar todas las fotos. No se añadió ninguna; vuelve a intentarlo.')
    expect(screen.getByText('0 de 10 fotos. La primera será la portada del anuncio.')).toBeInTheDocument()
    expect(screen.queryAllByRole('img')).toHaveLength(0)

    fireEvent.change(screen.getByLabelText(/Fotos del producto/), { target: { files: [new File(['retry'], 'producto-reintento.jpg', { type: 'image/jpeg' })] } })
    expect(await screen.findByText('1 de 10 fotos. La primera será la portada del anuncio.')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Fotos del producto, foto 1' })).toBeInTheDocument()
  })

  it('keeps the draft and prepared photos when upload fails, then retries without duplicating the listing', async () => {
    materialMocks.uploadPhotos
      .mockRejectedValueOnce(new Error('MATERIAL_PHOTO_UPLOAD_FAILED'))
      .mockResolvedValueOnce(['owner/listing/photo-1.webp'])
    render(<MaterialListingSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Material de prueba QA' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Descripción de prueba suficientemente larga para el anuncio.' } })
    await advanceMaterialTo(4)
    fireEvent.change(screen.getByLabelText(/Fotos del producto/), { target: { files: [new File(['one'], 'producto.jpg', { type: 'image/jpeg' })] } })
    await screen.findByText('1 de 10 fotos. La primera será la portada del anuncio.')

    await submitMaterial()
    expect(await screen.findByRole('alert')).toHaveTextContent('El anuncio quedó guardado como pendiente, pero no se pudieron cargar las fotos. Vuelve a intentarlo para adjuntarlas.')
    expect(materialMocks.create).toHaveBeenCalledTimes(1)
    await advanceMaterialTo(4)
    expect(await screen.findByRole('img', { name: 'Fotos del producto, foto 1' })).toBeInTheDocument()

    await advanceMaterialTo(5)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }))
    expect(await screen.findByRole('heading', { name: 'Anuncio enviado a revisión' })).toBeInTheDocument()
    expect(materialMocks.create).toHaveBeenCalledTimes(1)
    expect(materialMocks.uploadPhotos).toHaveBeenCalledTimes(2)
    expect(materialMocks.update).toHaveBeenCalledWith('listing-qa', expect.objectContaining({ photoPaths: ['owner/listing/photo-1.webp'] }))
  })

  it('reuses the same slug when creating again after an ambiguous create failure', async () => {
    materialMocks.create
      .mockRejectedValueOnce(new Error('MATERIAL_LISTING_CREATE_FAILED'))
      .mockResolvedValueOnce('listing-recovered')
    render(<MaterialListingSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Material de prueba QA' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Descripción de prueba suficientemente larga para el anuncio.' } })

    await submitMaterial()
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo confirmar el guardado/i)
    const firstSlug = materialMocks.create.mock.calls[0]?.[1]
    expect(firstSlug).toMatch(/^material-de-prueba-qa-[0-9a-f]{32}$/)

    fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Título ajustado al reintentar' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }))
    expect(await screen.findByRole('heading', { name: 'Anuncio enviado a revisión' })).toBeInTheDocument()
    expect(materialMocks.create).toHaveBeenCalledTimes(2)
    expect(materialMocks.create.mock.calls[1]?.[1]).toBe(firstSlug)
  })

  it('keeps uploaded photo paths and reuses them after an ambiguous listing update error', async () => {
    materialMocks.update
      .mockRejectedValueOnce(new Error('MATERIAL_LISTING_UPDATE_FAILED'))
      .mockResolvedValueOnce(undefined)
    render(<MaterialListingSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Material de prueba QA' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Descripción de prueba suficientemente larga para el anuncio.' } })
    await advanceMaterialTo(4)
    fireEvent.change(screen.getByLabelText(/Fotos del producto/), { target: { files: [new File(['one'], 'producto.jpg', { type: 'image/jpeg' })] } })
    await screen.findByText('1 de 10 fotos. La primera será la portada del anuncio.')

    await submitMaterial()
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo confirmar el guardado/i)
    expect(materialMocks.removePhotos).not.toHaveBeenCalled()
    expect(materialMocks.uploadPhotos).toHaveBeenCalledTimes(1)
    expect(materialMocks.createPreviews).toHaveBeenCalledWith('listing-qa', ['owner/listing/photo-1.webp', 'owner/listing/photo-2.webp'])

    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }))
    expect(await screen.findByRole('heading', { name: 'Anuncio enviado a revisión' })).toBeInTheDocument()
    expect(materialMocks.uploadPhotos).toHaveBeenCalledTimes(1)
    expect(materialMocks.update).toHaveBeenLastCalledWith('listing-qa', expect.objectContaining({
      photoPaths: ['owner/listing/photo-1.webp', 'owner/listing/photo-2.webp'],
    }))
  })
})

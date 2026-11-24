import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceProviderSubmissionPage } from './ServiceProviderSubmissionPage'

const serviceMocks = vi.hoisted(() => ({
  create: vi.fn(),
  fetchMine: vi.fn(),
  compressPhoto: vi.fn(),
  removePhotos: vi.fn(),
  update: vi.fn(),
  uploadPhotos: vi.fn(),
}))

vi.mock('../../modules/home-services/homeServiceRepository', () => ({
  createHomeServiceProvider: serviceMocks.create,
  fetchMyHomeServiceProviders: serviceMocks.fetchMine,
  updateHomeServiceProvider: serviceMocks.update,
}))

vi.mock('../../modules/home-services/homeServicePhotos', () => ({
  HOME_SERVICE_PHOTO_MAX_BYTES: 5 * 1024 * 1024,
  HOME_SERVICE_PHOTO_MAX_COUNT: 10,
  compressHomeServicePhoto: serviceMocks.compressPhoto,
  isHomeServicePhotoPath: (value: string) => value.endsWith('.webp'),
  removeUnattachedHomeServicePhotos: serviceMocks.removePhotos,
  uploadHomeServicePhotos: serviceMocks.uploadPhotos,
  validateHomeServicePhotoFiles: (files: readonly File[], existing: number) => existing + files.length > 10 ? 'TOO_MANY' : null,
}))
vi.mock('../publish/PublicationLocationField', () => ({
  PublicationLocationField: ({ onCoordinatesChange }: { onCoordinatesChange: (latitude: number, longitude: number) => void }) => <button type="button" onClick={() => onCoordinatesChange(23.12345, -82.34567)}>Marcar punto</button>,
}))

describe('ServiceProviderSubmissionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serviceMocks.fetchMine.mockResolvedValue([])
    serviceMocks.compressPhoto.mockImplementation(async (file: File) => new File([file], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }))
    serviceMocks.create.mockResolvedValue(undefined)
    serviceMocks.uploadPhotos.mockResolvedValue(['owner/photo-1.webp', 'owner/photo-2.webp'])
    serviceMocks.removePhotos.mockResolvedValue(undefined)
  })

  it('previews a multi-photo selection and uploads every optimized image in order', async () => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:service-preview'), revokeObjectURL: vi.fn() })
    render(<ServiceProviderSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del profesional o negocio'), { target: { value: 'Electricista de prueba' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Servicio de prueba para verificar la carga de una galería completa.' } })
    const first = new File(['one'], 'trabajo-1.jpg', { type: 'image/jpeg' })
    const second = new File(['two'], 'trabajo-2.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Fotos de tus trabajos'), { target: { files: [first, second] } })

    expect(await screen.findByText('2 de 10 fotos. La primera será la portada del anuncio.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(2))
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar a revisión' }).closest('form')!)

    await waitFor(() => expect(serviceMocks.uploadPhotos).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'trabajo-1.webp', type: 'image/webp' }),
      expect.objectContaining({ name: 'trabajo-2.webp', type: 'image/webp' }),
    ], 0))
    expect(serviceMocks.create).toHaveBeenCalledWith(expect.objectContaining({
      galleryUrls: ['owner/photo-1.webp', 'owner/photo-2.webp'],
    }), expect.any(String))
    expect(await screen.findByText('Perfil enviado a revisión')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('saves the selected coordinates with the service profile', async () => {
    render(<ServiceProviderSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del profesional o negocio'), { target: { value: 'Electricista de prueba' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Servicio de prueba con ubicación geográfica para el profesional.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Marcar punto' }))
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar a revisión' }).closest('form')!)
    await waitFor(() => expect(serviceMocks.create).toHaveBeenCalledWith(expect.objectContaining({ coordinates: { latitude: 23.12345, longitude: -82.34567 } }), expect.any(String)))
  })

  it('does not create the profile when a multi-photo upload fails', async () => {
    serviceMocks.uploadPhotos.mockRejectedValue(new Error('HOME_SERVICE_PHOTO_UPLOAD_FAILED'))
    render(<ServiceProviderSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del profesional o negocio'), { target: { value: 'Electricista de prueba' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Servicio de prueba con error controlado en la carga de fotos.' } })
    fireEvent.change(screen.getByLabelText('Fotos de tus trabajos'), { target: { files: [new File(['one'], 'trabajo.jpg', { type: 'image/jpeg' })] } })
    await screen.findByText('1 de 10 fotos. La primera será la portada del anuncio.')
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar a revisión' }).closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar todas las fotos. El perfil no se actualizó; vuelve a intentarlo.')
    expect(serviceMocks.create).not.toHaveBeenCalled()
  })

  it('cleans new photos only when the profile write is definitively rejected', async () => {
    serviceMocks.create.mockRejectedValueOnce(new Error('HOME_SERVICE_PROFILE_PERMISSION_DENIED'))
    render(<ServiceProviderSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del profesional o negocio'), { target: { value: 'Electricista de prueba' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Servicio de prueba con rechazo definitivo de permisos al guardar.' } })
    fireEvent.change(screen.getByLabelText('Fotos de tus trabajos'), { target: { files: [new File(['one'], 'trabajo.jpg', { type: 'image/jpeg' })] } })
    await screen.findByText('1 de 10 fotos. La primera será la portada del anuncio.')

    fireEvent.submit(screen.getByRole('button', { name: 'Enviar a revisión' }).closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent(/permiso de la cuenta/i)
    expect(serviceMocks.removePhotos).toHaveBeenCalledWith(['owner/photo-1.webp', 'owner/photo-2.webp'])
    expect(await screen.findByText('1 de 10 fotos. La primera será la portada del anuncio.')).toBeInTheDocument()
  })

  it('preserves uploaded photos when the profile write response is ambiguous', async () => {
    serviceMocks.create.mockRejectedValueOnce(new Error('HOME_SERVICE_PROFILE_CREATE_FAILED'))
    render(<ServiceProviderSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del profesional o negocio'), { target: { value: 'Electricista de prueba' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Servicio de prueba con respuesta de red ambigua al guardar.' } })
    fireEvent.change(screen.getByLabelText('Fotos de tus trabajos'), { target: { files: [new File(['one'], 'trabajo.jpg', { type: 'image/jpeg' })] } })
    await screen.findByText('1 de 10 fotos. La primera será la portada del anuncio.')

    fireEvent.submit(screen.getByRole('button', { name: 'Enviar a revisión' }).closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo confirmar el guardado/i)
    expect(serviceMocks.removePhotos).not.toHaveBeenCalled()
    expect(screen.getByText('1 de 10 fotos. La primera será la portada del anuncio.')).toBeInTheDocument()
  })

  it('reuses the profile id and uploaded photos when retrying an ambiguous save', async () => {
    serviceMocks.create.mockRejectedValueOnce(new Error('HOME_SERVICE_PROFILE_CREATE_FAILED'))
    render(<ServiceProviderSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del profesional o negocio'), { target: { value: 'Electricista de prueba' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Servicio para comprobar el reintento seguro tras perder la respuesta de red.' } })
    fireEvent.change(screen.getByLabelText('Fotos de tus trabajos'), { target: { files: [new File(['one'], 'trabajo.jpg', { type: 'image/jpeg' })] } })
    await screen.findByText('1 de 10 fotos. La primera será la portada del anuncio.')

    const submit = () => fireEvent.submit(screen.getByRole('button', { name: 'Enviar a revisión' }).closest('form')!)
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo confirmar el guardado/i)
    submit()

    expect(await screen.findByText('Perfil enviado a revisión')).toBeInTheDocument()
    expect(serviceMocks.uploadPhotos).toHaveBeenCalledTimes(1)
    expect(serviceMocks.create).toHaveBeenCalledTimes(2)
    expect(serviceMocks.create.mock.calls[0][1]).toBe(serviceMocks.create.mock.calls[1][1])
    expect(serviceMocks.create.mock.calls[0][0].galleryUrls).toEqual(serviceMocks.create.mock.calls[1][0].galleryUrls)
  })

  it('prevents submission while photos are still being prepared', async () => {
    let resolveCompression!: (photo: File) => void
    serviceMocks.compressPhoto.mockReturnValueOnce(new Promise<File>((resolve) => { resolveCompression = resolve }))
    render(<ServiceProviderSubmissionPage onBack={vi.fn()} onRequireLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del profesional o negocio'), { target: { value: 'Electricista de prueba' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Servicio de prueba mientras se prepara una foto seleccionada.' } })
    fireEvent.change(screen.getByLabelText('Fotos de tus trabajos'), { target: { files: [new File(['photo'], 'trabajo.jpg', { type: 'image/jpeg' })] } })

    expect(await screen.findByText('Preparando tus fotos…')).toBeInTheDocument()
    const form = screen.getByRole('button', { name: 'Preparando fotos…' }).closest('form')!
    expect(screen.getByRole('button', { name: 'Preparando fotos…' })).toBeDisabled()
    fireEvent.submit(form)

    expect(await screen.findByRole('alert')).toHaveTextContent('Espera a que terminen de prepararse las fotos antes de enviar.')
    expect(serviceMocks.create).not.toHaveBeenCalled()
    resolveCompression(new File(['photo'], 'trabajo.webp', { type: 'image/webp' }))
  })
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PublicationLocationField } from './PublicationLocationField'

vi.mock('../../modules/maps/components/AddressMap', () => ({
  AddressMap: ({ province, municipality, latitude, longitude }: { province: string; municipality: string; latitude: number | null; longitude: number | null }) => (
    <div data-testid="address-map" data-province={province} data-municipality={municipality} data-latitude={latitude} data-longitude={longitude} />
  ),
}))

describe('PublicationLocationField', () => {
  const geolocationDescriptor = Object.getOwnPropertyDescriptor(navigator, 'geolocation')
  afterEach(() => {
    vi.restoreAllMocks()
    if (geolocationDescriptor) Object.defineProperty(navigator, 'geolocation', geolocationDescriptor)
    else Reflect.deleteProperty(navigator, 'geolocation')
  })

  it('offers Cuba municipalities and updates the selected municipality', () => {
    const onProvinceChange = vi.fn()
    const onMunicipalityChange = vi.fn()
    const props = { latitude: null, longitude: null, onProvinceChange, onMunicipalityChange, onCoordinatesChange: vi.fn(), onClear: vi.fn() }
    const { rerender } = render(<PublicationLocationField {...props} province="" municipality="" />)

    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'La Habana' } })
    expect(onProvinceChange).toHaveBeenCalledWith('La Habana')
    rerender(<PublicationLocationField {...props} province="La Habana" municipality="" />)
    expect(screen.getByRole('option', { name: 'Playa' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Municipio'), { target: { value: 'Playa' } })
    expect(onMunicipalityChange).toHaveBeenCalledWith('Playa')
  })

  it('uses the device location only after the user requests it', async () => {
    const onCoordinatesChange = vi.fn()
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({ coords: { latitude: 23.1, longitude: -82.4 } as GeolocationCoordinates } as GeolocationPosition))
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
    render(<PublicationLocationField province="La Habana" municipality="Playa" latitude={null} longitude={null} onProvinceChange={vi.fn()} onMunicipalityChange={vi.fn()} onCoordinatesChange={onCoordinatesChange} onClear={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))
    await waitFor(() => expect(onCoordinatesChange).toHaveBeenCalledWith(23.1, -82.4))
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), expect.objectContaining({ enableHighAccuracy: true }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ubicación del dispositivo marcada')
  })

  it('explains when device location is unavailable', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
    render(<PublicationLocationField province="La Habana" municipality="Playa" latitude={null} longitude={null} onProvinceChange={vi.fn()} onMunicipalityChange={vi.fn()} onCoordinatesChange={vi.fn()} onClear={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Este navegador no permite obtener la ubicación del dispositivo.')
  })
})

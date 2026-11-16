import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MultiPhotoUploadField } from './MultiPhotoUploadField'

describe('MultiPhotoUploadField', () => {
  it('uses customer-facing upload copy without exposing the image conversion format', () => {
    const onSelectFiles = vi.fn()
    const onRemoveFile = vi.fn()
    const onRemoveExisting = vi.fn()
    const props = { label: 'Fotos del producto', files: [], existingPhotos: [], maxCount: 10, maxSizeLabel: '5 MiB', onSelectFiles, onRemoveFile, onRemoveExisting }

    const { container, rerender } = render(<MultiPhotoUploadField {...props} isCompressing={false} />)

    expect(screen.getByText('Selecciona varias fotos')).toBeInTheDocument()
    expect(container).toHaveTextContent('Máximo 10 fotos y 5 MiB por archivo.')
    expect(container).not.toHaveTextContent(/webp|convertidor|comprimiendo|optimiz/i)

    rerender(<MultiPhotoUploadField {...props} isCompressing />)

    expect(screen.getByText('Preparando tus fotos…')).toBeInTheDocument()
    expect(container).not.toHaveTextContent(/webp|convertidor|comprimiendo|optimiz/i)
  })

  it('selects several files and reports removals while showing existing and new photos', () => {
    const onSelectFiles = vi.fn()
    const onRemoveFile = vi.fn()
    const onRemoveExisting = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() })
    render(<MultiPhotoUploadField label="Fotos del producto" files={[new File(['webp'], 'one.webp', { type: 'image/webp' })]} existingPhotos={[{ id: 'saved', src: 'https://example.com/saved.jpg' }]} maxCount={10} maxSizeLabel="5 MiB" isCompressing={false} onSelectFiles={onSelectFiles} onRemoveFile={onRemoveFile} onRemoveExisting={onRemoveExisting} />)

    const input = screen.getByLabelText('Fotos del producto')
    fireEvent.change(input, { target: { files: [new File(['a'], 'a.jpg'), new File(['b'], 'b.jpg')] } })
    expect(onSelectFiles).toHaveBeenCalledWith(expect.arrayContaining([expect.any(File), expect.any(File)]))
    expect(screen.getByText('2 de 10 fotos. La primera será la portada del anuncio.')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Quitar foto 1' }))
    expect(onRemoveExisting).toHaveBeenCalledWith({ id: 'saved', src: 'https://example.com/saved.jpg' })
    fireEvent.click(screen.getByRole('button', { name: 'Quitar foto 2' }))
    expect(onRemoveFile).toHaveBeenCalledWith(0)
    vi.unstubAllGlobals()
  })
})

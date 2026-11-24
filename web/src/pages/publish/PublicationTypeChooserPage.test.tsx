import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PublicationTypeChooserPage } from './PublicationTypeChooserPage'

vi.mock('../../shared/hooks/useSEO', () => ({ useSEO: vi.fn() }))

describe('PublicationTypeChooserPage', () => {
  it('offers the three enabled publication types and routes to the selected flow', () => {
    const onChooseProperty = vi.fn()
    const onChooseService = vi.fn()
    const onChooseMaterial = vi.fn()
    render(<PublicationTypeChooserPage onBack={vi.fn()} onChooseProperty={onChooseProperty} onChooseService={onChooseService} onChooseMaterial={onChooseMaterial} servicesEnabled materialsEnabled />)

    fireEvent.click(screen.getByRole('button', { name: 'Publicar inmueble' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar servicio' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar material' }))

    expect(onChooseProperty).toHaveBeenCalledOnce()
    expect(onChooseService).toHaveBeenCalledOnce()
    expect(onChooseMaterial).toHaveBeenCalledOnce()
  })

  it('keeps unavailable publication categories disabled', () => {
    render(<PublicationTypeChooserPage onBack={vi.fn()} onChooseProperty={vi.fn()} onChooseService={vi.fn()} onChooseMaterial={vi.fn()} servicesEnabled={false} materialsEnabled={false} />)
    expect(screen.getByRole('button', { name: 'Publicar inmueble' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Publicar servicio' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Publicar material' })).toBeDisabled()
  })
})

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageLoadingState } from './CubitatApp'

describe('PageLoadingState', () => {
  it('usa un layout critico autonomo para resultados antes del chunk lazy', () => {
    const { container } = render(<PageLoadingState pageMode="results" />)
    const fallback = container.querySelector('[aria-label="Cargando resultados"]')

    expect(fallback).toHaveClass('results-route-fallback')
    expect(container.querySelector('.results-route-fallback__toolbar')).toBeInTheDocument()
    expect(container.querySelector('.results-route-fallback__grid')).toBeInTheDocument()
    expect(fallback).not.toHaveClass('workspace-catalog', 'results-loading-shell')
  })
})

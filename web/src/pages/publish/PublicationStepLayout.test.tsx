import { fireEvent, render, screen } from '@testing-library/react'
import { useState, type FormEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PublicationStepLayout } from './PublicationStepLayout'

describe('PublicationStepLayout', () => {
  it('does not submit the form when advancing into the final step', () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault())

    function Harness() {
      const [step, setStep] = useState(1)
      return (
        <form onSubmit={onSubmit}>
          <PublicationStepLayout
            steps={[{ label: 'Datos', description: 'Completa los datos.' }, { label: 'Contacto', description: 'Envía el anuncio.' }]}
            step={step}
            onNavigate={setStep}
            onBack={vi.fn()}
            onNext={() => setStep(2)}
            isLastStep={step === 2}
            submitLabel="Enviar a revisión"
          >
            <p>Paso {step}</p>
          </PublicationStepLayout>
        </form>
      )
    }

    render(<Harness />)
    const continueButton = screen.getByRole('button', { name: /Continuar/ })
    fireEvent.click(continueButton)

    expect(screen.getByRole('heading', { name: 'Contacto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar a revisión' })).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

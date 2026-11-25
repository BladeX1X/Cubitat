import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import './PublicationStepLayout.css'

export type PublicationStep = { label: string; description: string }

type PublicationStepLayoutProps = {
  steps: PublicationStep[]
  step: number
  onNavigate: (step: number) => void
  onBack: () => void
  onNext: () => void
  isLastStep: boolean
  busy?: boolean
  submitLabel: string
  children: ReactNode
}

export function PublicationStepLayout({ steps, step, onNavigate, onBack, onNext, isLastStep, busy = false, submitLabel, children }: PublicationStepLayoutProps) {
  const active = steps[step - 1]
  const progress = Math.round((step / steps.length) * 100)

  return (
    <>
      <div className="publication-step-progress" aria-label="Progreso de publicación">
        <div><span>Paso {step} de {steps.length}</span><strong>{active.label}</strong></div>
        <div aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="publication-step-layout">
        <nav className="publication-step-nav" aria-label="Pasos de publicación">
          {steps.map((item, index) => {
            const value = index + 1
            const complete = value < step
            return (
              <button key={item.label} type="button" className={`publication-step-nav-item ${value === step ? 'active' : ''} ${complete ? 'complete' : ''}`} aria-current={value === step ? 'step' : undefined} onClick={() => value <= step && onNavigate(value)} disabled={value > step}>
                <span className="publication-step-number">{complete ? <Check size={13} /> : value}</span>
                <span><strong>{item.label}</strong><small>{item.description}</small></span>
              </button>
            )
          })}
        </nav>
        <section className="publication-step-card" aria-labelledby="publication-step-title">
          <header><div><p>Paso {step}</p><h2 id="publication-step-title">{active.label}</h2><span>{active.description}</span></div></header>
          <div className="publication-step-card-body">{children}</div>
          <div className="publication-step-actions">
            <Button type="button" variant="outline" onClick={onBack} disabled={busy} className="min-h-11" aria-label={step === 1 ? 'Volver al catálogo' : 'Paso anterior'}><ArrowLeft size={16} />{step === 1 ? 'Volver' : 'Anterior'}</Button>
            {isLastStep
              ? <Button type="submit" className="min-h-11" disabled={busy}>{busy ? 'Enviando…' : submitLabel}</Button>
              : <Button type="button" className="min-h-11" disabled={busy} onClick={onNext}>Continuar<ArrowRight size={16} /></Button>}
          </div>
        </section>
      </div>
    </>
  )
}

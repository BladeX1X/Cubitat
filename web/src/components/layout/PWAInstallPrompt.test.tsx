import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PWAInstallPrompt, PWA_INSTALL_REQUEST_EVENT } from './PWAInstallPrompt'

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra instrucciones manuales aunque el aviso automático se haya descartado', () => {
    localStorage.setItem('cubitat_pwa_prompt_dismissed', 'true')
    render(<PWAInstallPrompt />)

    act(() => window.dispatchEvent(new Event(PWA_INSTALL_REQUEST_EVENT)))

    expect(screen.getByText('Instalar Cubitat')).toBeInTheDocument()
    expect(screen.getByText(/abre el menú de tu navegador/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument()
  })

  it('usa el instalador nativo cuando el navegador lo ofrece', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    render(<PWAInstallPrompt />)

    act(() => window.dispatchEvent(event))
    screen.getByRole('button', { name: 'Instalar app' }).click()

    expect(prompt).toHaveBeenCalledOnce()
  })
})

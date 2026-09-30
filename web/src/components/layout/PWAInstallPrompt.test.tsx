import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PWAInstallPrompt, PWA_INSTALL_REQUEST_EVENT } from './PWAInstallPrompt'

const registerSW = vi.hoisted(() => vi.fn())

vi.mock('virtual:pwa-register', () => ({ registerSW }))

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear()
    registerSW.mockReset()
    registerSW.mockReturnValue(vi.fn().mockResolvedValue(undefined))
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
      configurable: true,
      value: vi.fn().mockResolvedValue([]),
    })
  })

  afterEach(() => {
    delete (window.navigator as Navigator & { getInstalledRelatedApps?: unknown }).getInstalledRelatedApps
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('muestra instrucciones manuales aunque el aviso automático se haya descartado', async () => {
    localStorage.setItem('cubitat_pwa_prompt_dismissed', 'true')
    render(<PWAInstallPrompt />)

    act(() => window.dispatchEvent(new Event(PWA_INSTALL_REQUEST_EVENT)))

    expect(await screen.findByText('Instalar Cubitat')).toBeInTheDocument()
    expect(screen.getByText(/elige Instalar aplicación/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument()
  })

  it('muestra en Android solo las instrucciones de Chrome', async () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36')
    render(<PWAInstallPrompt />)

    act(() => window.dispatchEvent(new Event(PWA_INSTALL_REQUEST_EVENT)))

    expect(await screen.findByText(/En Chrome, abre el menú/i)).toBeInTheDocument()
    expect(screen.getByText(/Instalar aplicación/i)).toBeInTheDocument()
    expect(screen.queryByText(/Añadir a pantalla de inicio/i)).not.toBeInTheDocument()
  })

  it('avisa cuando Cubitat ya está instalada en Android', async () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36')
    Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
      configurable: true,
      value: vi.fn().mockResolvedValue([
        {
          platform: 'webapp',
          id: 'https://cubitathome.com/',
          url: 'https://cubitathome.com/manifest.webmanifest',
        },
      ]),
    })
    render(<PWAInstallPrompt />)

    act(() => window.dispatchEvent(new Event(PWA_INSTALL_REQUEST_EVENT)))

    expect(await screen.findByText('Cubitat ya está instalada')).toBeInTheDocument()
    expect(screen.getByText(/ábrela desde el icono de Cubitat/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entendido' })).toBeInTheDocument()
    expect(screen.queryByText(/Añadir a pantalla de inicio/i)).not.toBeInTheDocument()
  })

  it('no muestra el aviso automático si la PWA ya estaba instalada', async () => {
    Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
      configurable: true,
      value: vi.fn().mockResolvedValue([{
        platform: 'webapp',
        id: 'https://cubitathome.com/',
        url: 'https://cubitathome.com/manifest.webmanifest',
      }]),
    })
    render(<PWAInstallPrompt />)

    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    act(() => window.dispatchEvent(event))

    await act(async () => {})
    expect(screen.queryByText('Instalar Cubitat')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument()
    expect(event.prompt).not.toHaveBeenCalled()
  })

  it('ignora una PWA instalada que no pertenece a Cubitat', async () => {
    Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
      configurable: true,
      value: vi.fn().mockResolvedValue([{
        platform: 'webapp',
        id: 'https://otra-aplicacion.example/',
        url: 'https://otra-aplicacion.example/manifest.webmanifest',
      }]),
    })
    render(<PWAInstallPrompt />)

    act(() => window.dispatchEvent(new Event(PWA_INSTALL_REQUEST_EVENT)))

    expect(await screen.findByText(/Abre el menú de tu navegador/i)).toBeInTheDocument()
    expect(screen.queryByText('Cubitat ya está instalada')).not.toBeInTheDocument()
  })

  it('muestra en iOS los pasos reales y una confirmación visible', async () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
    render(<PWAInstallPrompt />)

    act(() => window.dispatchEvent(new Event(PWA_INSTALL_REQUEST_EVENT)))

    expect(await screen.findByText(/En Safari, pulsa Compartir/i)).toBeInTheDocument()
    expect(screen.getByText('Añadir a pantalla de inicio')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entendido' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument()
  })

  it('detecta un iPad que solicita la versión de escritorio', async () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)')
    vi.spyOn(window.navigator, 'maxTouchPoints', 'get').mockReturnValue(5)
    render(<PWAInstallPrompt />)

    act(() => window.dispatchEvent(new Event(PWA_INSTALL_REQUEST_EVENT)))

    expect(await screen.findByText(/En Safari, pulsa Compartir/i)).toBeInTheDocument()
  })

  it('usa el instalador nativo cuando el navegador lo ofrece', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    render(<PWAInstallPrompt />)

    act(() => window.dispatchEvent(event))
    const installButton = await screen.findByRole('button', { name: 'Instalar app' })
    await act(async () => installButton.click())

    expect(prompt).toHaveBeenCalledOnce()
  })

  it('vuelve a ofrecer la instalación siete días después de elegir Quizás luego', async () => {
    const now = Date.UTC(2026, 8, 9, 12)
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(now)
    const createInstallEvent = () => Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
    })
    const firstRender = render(<PWAInstallPrompt />)

    act(() => window.dispatchEvent(createInstallEvent()))
    const dismissButton = await screen.findByRole('button', { name: 'Quizás luego' })
    await act(async () => dismissButton.click())
    expect(localStorage.getItem('cubitat_pwa_prompt_dismissed')).toBe(String(now))
    firstRender.unmount()

    dateNow.mockReturnValue(now + 6 * 24 * 60 * 60 * 1000)
    const earlyRender = render(<PWAInstallPrompt />)
    act(() => window.dispatchEvent(createInstallEvent()))
    await act(async () => {})
    expect(screen.queryByText('Instalar Cubitat')).not.toBeInTheDocument()
    earlyRender.unmount()

    dateNow.mockReturnValue(now + 7 * 24 * 60 * 60 * 1000 + 1)
    render(<PWAInstallPrompt />)
    act(() => window.dispatchEvent(createInstallEvent()))
    expect(await screen.findByText('Instalar Cubitat')).toBeInTheDocument()
  })

  it('muestra y aplica la actualización del service worker', async () => {
    let onNeedRefresh: (() => void) | undefined
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined)
    registerSW.mockImplementation((options: { onNeedRefresh?: () => void }) => {
      onNeedRefresh = options.onNeedRefresh
      return updateServiceWorker
    })

    render(<PWAInstallPrompt />)
    expect(registerSW).toHaveBeenCalledOnce()

    act(() => onNeedRefresh?.())
    expect(await screen.findByText('Actualización disponible')).toBeInTheDocument()

    await screen.getByRole('button', { name: 'Actualizar' }).click()
    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })
})

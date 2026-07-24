import { act, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TurnstileWidget } from './TurnstileWidget'

type TurnstileOptions = {
  callback: (token: string) => void
}

type TurnstileMock = {
  render: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
}

function Harness() {
  const [token, setToken] = useState('')

  return (
    <>
      <TurnstileWidget
        action="contact-owner"
        onVerify={(nextToken) => setToken(nextToken)}
        onExpire={() => setToken('')}
        onError={() => setToken('')}
      />
      <output>{token}</output>
    </>
  )
}

describe('TurnstileWidget', () => {
  afterEach(() => {
    delete (window as Window & { turnstile?: TurnstileMock }).turnstile
  })

  it('no remonta el desafio cuando el callback actualiza el formulario', () => {
    let options: TurnstileOptions | undefined
    const turnstile: TurnstileMock = {
      render: vi.fn((_container: HTMLElement, nextOptions: TurnstileOptions) => {
        options = nextOptions
        return 'widget-1'
      }),
      remove: vi.fn(),
    }
    ;(window as Window & { turnstile?: TurnstileMock }).turnstile = turnstile

    render(<Harness />)
    expect(turnstile.render).toHaveBeenCalledTimes(1)

    act(() => options?.callback('verified-token'))

    expect(screen.getByText('verified-token')).toBeInTheDocument()
    expect(turnstile.render).toHaveBeenCalledTimes(1)
    expect(turnstile.remove).not.toHaveBeenCalled()
  })
})

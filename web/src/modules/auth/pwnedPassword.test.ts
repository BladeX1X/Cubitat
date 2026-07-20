import { describe, expect, it, vi } from 'vitest'
import { checkPwnedPassword } from './pwnedPassword'

describe('Pwned Passwords k-anonymity check', () => {
  it('sends only the SHA-1 prefix and detects a matching suffix', async () => {
    const request = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(
      '1E4C9B93F3F0682250B6CF8331B7EE68FD8:42\r\n00000000000000000000000000000000000:0',
      { status: 200 },
    ))

    const result = await checkPwnedPassword('password', request)

    expect(result).toEqual({ status: 'pwned', occurrences: 42 })
    expect(request).toHaveBeenCalledTimes(1)
    const [url, options] = request.mock.calls[0]
    expect(url).toBe('https://api.pwnedpasswords.com/range/5BAA6')
    expect(options?.headers).toMatchObject({
      'Add-Padding': 'true',
      'User-Agent': 'Cubitat-Password-Security/1.0 (+https://cubitathome.com)',
    })
    expect(String(url)).not.toContain('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8')
  })

  it('accepts a password when its suffix is absent', async () => {
    const request = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(
      '00000000000000000000000000000000000:0',
      { status: 200 },
    ))

    await expect(checkPwnedPassword('password', request)).resolves.toEqual({ status: 'safe' })
  })

  it('reports the service as unavailable without exposing the password', async () => {
    const request = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('unavailable', { status: 503 }))

    await expect(checkPwnedPassword('password', request)).resolves.toEqual({ status: 'unavailable' })
  })
})

import { request as httpRequest } from 'node:http'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { describe, expect, it } from 'vitest'

describe('Vite development server network boundary', () => {
  it('allows one configured hostname and rejects unrelated or ambient override hosts', async () => {
    const previousAllowedHosts = process.env.CUBITAT_DEV_ADDITIONAL_ALLOWED_HOSTS
    const previousViteOverride = process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
    process.env.CUBITAT_DEV_ADDITIONAL_ALLOWED_HOSTS = 'preview.example.com'
    process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS = 'attacker.example'

    let server: Awaited<ReturnType<typeof createServer>> | undefined

    try {
      server = await createServer({
        configFile: resolve(process.cwd(), 'vite.config.ts'),
        server: { host: '127.0.0.1', port: 0, strictPort: true },
      })
      await server.listen()
      const address = server.httpServer?.address()
      if (!address || typeof address === 'string') {
        throw new Error('Vite did not expose a TCP listener address.')
      }

      const requestStatus = (host: string) => new Promise<number>((resolveStatus, reject) => {
        const request = httpRequest({
          hostname: '127.0.0.1',
          port: address.port,
          path: '/',
          headers: { host },
        }, (response) => {
          response.resume()
          response.once('end', () => resolveStatus(response.statusCode ?? 0))
        })
        request.once('error', reject)
        request.end()
      })

      await expect(requestStatus('localhost')).resolves.toBe(200)
      await expect(requestStatus('preview.example.com')).resolves.toBe(200)
      await expect(requestStatus('attacker.example')).resolves.toBe(403)
    } finally {
      await server?.close()
      if (previousAllowedHosts === undefined) {
        delete process.env.CUBITAT_DEV_ADDITIONAL_ALLOWED_HOSTS
      } else {
        process.env.CUBITAT_DEV_ADDITIONAL_ALLOWED_HOSTS = previousAllowedHosts
      }
      if (previousViteOverride === undefined) {
        delete process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
      } else {
        process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS = previousViteOverride
      }
    }
  }, 15_000)
})

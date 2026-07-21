import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('Worker observability security', () => {
  it('disables automatic invocation logs while keeping safe custom logs enabled', () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), 'wrangler.jsonc'), 'utf8'),
    ) as {
      observability?: {
        enabled?: boolean
        logs?: {
          enabled?: boolean
          head_sampling_rate?: number
          invocation_logs?: boolean
        }
      }
    }

    expect(config.observability).toMatchObject({
      enabled: true,
      logs: {
        enabled: true,
        head_sampling_rate: 1,
        invocation_logs: false,
      },
    })
  })

  it('routes Worker diagnostics through the safe structured logger', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/worker.ts'), 'utf8')

    expect(source).not.toMatch(/console\.(?:log|info|warn|error)\s*\(/)
    expect(source).not.toContain('Resend already-confirmed email failed:')
  })
})

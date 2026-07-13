import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('seed sintetico', () => {
  it('no modifica filas existentes al volver a ejecutarse', () => {
    const generator = readFileSync(resolve(process.cwd(), 'scripts/seed-synthetic.mjs'), 'utf8')
    const generatedSql = readFileSync(resolve(process.cwd(), 'scripts/seed-synthetic.sql'), 'utf8')

    expect(generator).toContain('ON CONFLICT (id) DO NOTHING')
    expect(generator).not.toContain('ON CONFLICT (id) DO UPDATE')
    expect(generatedSql).toContain('ON CONFLICT (id) DO NOTHING')
    expect(generatedSql).not.toContain('ON CONFLICT (id) DO UPDATE')
  })
})

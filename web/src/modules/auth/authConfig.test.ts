/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const authConfig = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8')

describe('versioned Supabase Auth hardening', () => {
  it('enforces the same strong password policy as the frontend', () => {
    expect(authConfig).toContain('minimum_password_length = 8')
    expect(authConfig).toContain('password_requirements = "lower_upper_letters_digits_symbols"')
  })

  it('requires a recent authentication for password changes', () => {
    expect(authConfig).toContain('secure_password_change = true')
  })

  it('prevents repeated Auth emails inside one minute', () => {
    expect(authConfig).toContain('max_frequency = "1m"')
  })
})

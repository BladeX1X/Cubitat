import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const devMigrationFiles = [
  '20261010100000_verified_seller_public_badge.sql',
  '20261012170000_include_verified_admin_sellers.sql',
]

describe('verified seller DEV migrations', () => {
  it.each(devMigrationFiles)('%s refreshes the PostgREST schema cache', (file) => {
    const sql = readFileSync(resolve('supabase/dev-migrations', file), 'utf8')

    expect(sql).toMatch(/NOTIFY\s+pgrst\s*,\s*'reload schema'\s*;/i)
  })
})

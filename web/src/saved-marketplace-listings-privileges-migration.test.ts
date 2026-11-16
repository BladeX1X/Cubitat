import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/migrations/20261116120000_phase4_saved_marketplace_privileges.sql?raw'

describe('saved marketplace listings privileges migration', () => {
  it('removes inherited/default grants before allowing only owner-facing operations', () => {
    expect(migrationSql).toMatch(
      /REVOKE ALL ON TABLE public\.saved_marketplace_listings\s+FROM PUBLIC, anon, authenticated, service_role/i,
    )
    expect(migrationSql).toMatch(
      /GRANT SELECT, INSERT, DELETE\s+ON TABLE public\.saved_marketplace_listings TO authenticated/i,
    )
    expect(migrationSql).not.toMatch(/GRANT[^;]*\bUPDATE\b[^;]*saved_marketplace_listings/i)
  })
})

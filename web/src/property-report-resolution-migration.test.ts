import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/migrations/20261115130000_atomic_property_report_resolution.sql?raw'

describe('atomic property report resolution migration', () => {
  it('requires admin AAL2 and binds a pending report to its property', () => {
    expect(migrationSql).toMatch(/IF NOT public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/property_id = p_property_id[\s\S]*status = 'pending'/i)
    expect(migrationSql).toMatch(/RAISE EXCEPTION 'property_report_not_resolvable'/i)
  })

  it('resolves and pauses the property inside one database function', () => {
    expect(migrationSql).toMatch(/UPDATE public\.property_reports[\s\S]*SET status = 'resolved'/i)
    expect(migrationSql).toMatch(/UPDATE public\.properties[\s\S]*SET status = 'paused'/i)
    expect(migrationSql).toMatch(/RAISE EXCEPTION 'reported_property_not_found'/i)
    expect(migrationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.resolve_property_report\(uuid, uuid\)[\s\S]*TO authenticated/i)
  })
})

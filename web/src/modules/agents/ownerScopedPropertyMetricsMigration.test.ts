import { describe, expect, it } from 'vitest'
import standardSql from '../../../supabase/migrations/20261027120000_add_owner_scoped_property_contact_metrics.sql?raw'
import devSql from '../../../supabase/dev-migrations/20261027120000_add_owner_scoped_property_contact_metrics.sql?raw'

const executableSql = (sql: string) => sql.replace(/--[^\r\n]*/g, '').replace(/\s+/g, ' ').trim()

describe('owner-scoped property contact metrics migration', () => {
  it('keeps the standard and DEV migrations aligned', () => {
    expect(executableSql(devSql)).toBe(executableSql(standardSql))
  })

  it('returns contact metrics only for the authenticated verified agent own rows', () => {
    expect(standardSql).toMatch(/SECURITY DEFINER[\s\S]*?SET search_path = pg_catalog/i)
    expect(standardSql).toContain('property.user_id = auth.uid()')
    expect(standardSql).toContain("profile.role::text IN ('agent', 'admin')")
    expect(standardSql).toContain("profile.verification_status = 'verified'")
    expect(standardSql).toMatch(/REVOKE ALL ON FUNCTION public\.get_own_property_contact_metrics\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
    expect(standardSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_own_property_contact_metrics\(\)[\s\S]*TO authenticated/i)
    expect(standardSql).not.toMatch(/phone_clicks_count\s*,\s*whatsapp_clicks_count\s+ON TABLE/i)
  })
})

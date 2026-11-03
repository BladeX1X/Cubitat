import { describe, expect, it } from 'vitest'
import migrationSql from '../../../supabase/migrations/20261025140000_bound_agent_lead_text_inputs.sql?raw'
import devMigrationSql from '../../../supabase/dev-migrations/20261025140000_bound_agent_lead_text_inputs.sql?raw'

describe('agent lead raw input bounds migration', () => {
  it('keeps production and DEV migration bodies identical', () => {
    expect(devMigrationSql).toBe(migrationSql)
  })

  it('rejects oversized raw text before trim and phone regex processing', () => {
    const rawBoundsPosition = migrationSql.indexOf('IF (p_lead_type IS NOT NULL AND octet_length(p_lead_type) > 32)')
    const trimPosition = migrationSql.indexOf('p_contact_phone := btrim(p_contact_phone)')
    const regexPosition = migrationSql.indexOf("p_contact_phone !~ '^[+0-9(). -]+$'")

    expect(rawBoundsPosition).toBeGreaterThan(-1)
    expect(rawBoundsPosition).toBeLessThan(trimPosition)
    expect(trimPosition).toBeLessThan(regexPosition)
    expect(migrationSql).toContain('octet_length(p_contact_phone) > 64')
    expect(migrationSql).toContain('octet_length(p_notes) > 4000')
  })
})

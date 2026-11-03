import { describe, expect, it } from 'vitest'
import migrationSql from '../../../supabase/migrations/20261027100000_make_lost_agent_leads_final.sql?raw'
import devMigrationSql from '../../../supabase/dev-migrations/20261027100000_make_lost_agent_leads_final.sql?raw'

describe('lost agent lead finality migration', () => {
  it('keeps the standard and DEV RPC definitions aligned', () => {
    expect(devMigrationSql).toBe(migrationSql)
  })

  it('permits reopening a lost lead only for an AAL2 administrator', () => {
    expect(migrationSql).toMatch(/v_previous\s*=\s*'lost' AND p_status\s*=\s*'contacted' AND NOT v_is_admin/i)
    expect(migrationSql).toContain("OR (NOT v_is_admin AND p_status IN ('converted', 'lost'))")
    expect(migrationSql).toMatch(/v_previous\s*=\s*'lost'[\s\S]*p_status\s*=\s*'contacted'[\s\S]*p_note IS NULL/i)
    expect(migrationSql).toContain('Review note required for administrative status change.')
    expect(migrationSql).toContain("USING ERRCODE = '22023'")
    expect(migrationSql).toContain('SET search_path = pg_catalog')
  })
})

import { describe, expect, it } from 'vitest'
import migrationSql from '../../../supabase/migrations/20261025010000_bound_agent_lead_creation.sql?raw'
import devMigrationSql from '../../../supabase/dev-migrations/20261025010000_bound_agent_lead_creation.sql?raw'

describe('agent lead creation quota migration', () => {
  it('applies the same atomic rolling quota to production and DEV migration tracks', () => {
    const productionFunction = migrationSql.slice(migrationSql.indexOf('CREATE OR REPLACE FUNCTION'))
    const devFunction = devMigrationSql.slice(devMigrationSql.indexOf('CREATE OR REPLACE FUNCTION'))

    expect(devFunction).toBe(productionFunction)
    expect(migrationSql).toContain("set_config('lock_timeout', '2s', true)")
    expect(migrationSql).toMatch(/pg_advisory_xact_lock\(hashtextextended\('agent-lead-quota:' \|\| v_agent_id::text, 0\)\)/i)
    expect(migrationSql).toMatch(/SELECT count\(\*\)[\s\S]*FROM public\.agent_leads[\s\S]*WHERE agent_id = v_agent_id[\s\S]*created_at >= clock_timestamp\(\) - interval '24 hours'/i)
    expect(migrationSql).toMatch(/IF v_recent_lead_count >= 20 THEN[\s\S]*USING ERRCODE = '54000'/i)
  })

  it('takes the per-agent lock before the count and keeps writes inside the guarded RPC', () => {
    const lockPosition = migrationSql.indexOf('pg_advisory_xact_lock')
    const countPosition = migrationSql.indexOf('SELECT count(*) INTO v_recent_lead_count')
    const leadInsertPosition = migrationSql.indexOf('INSERT INTO public.agent_leads (')
    const eventInsertPosition = migrationSql.indexOf('INSERT INTO public.agent_lead_events (')

    expect(lockPosition).toBeGreaterThan(-1)
    expect(lockPosition).toBeLessThan(countPosition)
    expect(countPosition).toBeLessThan(leadInsertPosition)
    expect(leadInsertPosition).toBeLessThan(eventInsertPosition)
    expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.create_agent_lead')
    expect(migrationSql).toContain('FROM PUBLIC, anon')
    expect(migrationSql).toContain('TO authenticated')
  })
})

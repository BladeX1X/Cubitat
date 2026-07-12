import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/migrations/20260711002000_harden_profiles_contacts_reports.sql?raw'

describe('database security migration contract', () => {
  it('reconciles optional contact columns before policies reference them', () => {
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS referral_id text')
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct'")
  })

  it('fixes search_path and removes public execution from privileged functions', () => {
    expect(migrationSql).toMatch(/FUNCTION public\.is_admin\(\)[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = public/i)
    expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC')
    expect(migrationSql).toMatch(/FUNCTION public\.handle_new_contact\(\)[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = public/i)
    expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.handle_new_contact() FROM PUBLIC')
  })

  it('restricts profile reads to the owner or an administrator', () => {
    expect(migrationSql).toContain('DROP POLICY IF EXISTS "Allow authenticated read for profiles"')
    expect(migrationSql).toMatch(/Profiles are readable by owner or admin[\s\S]*id = auth\.uid\(\)[\s\S]*public\.is_admin\(\)/i)
  })

  it('only accepts contacts and reports for published properties', () => {
    expect(migrationSql).toMatch(/Allow validated contacts for published properties[\s\S]*properties\.status = 'published'/i)
    expect(migrationSql).toMatch(/Anyone can insert a report[\s\S]*properties\.status = 'published'/i)
  })

  it('bounds public text input lengths', () => {
    expect(migrationSql).toContain('char_length(btrim(contact_name)) BETWEEN 2 AND 120')
    expect(migrationSql).toContain('char_length(btrim(contact_phone)) BETWEEN 6 AND 40')
    expect(migrationSql).toContain('char_length(btrim(message)) BETWEEN 5 AND 2000')
    expect(migrationSql).toContain('char_length(description) <= 2000')
  })
})

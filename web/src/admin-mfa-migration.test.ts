import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/migrations/20260719001000_enforce_admin_mfa.sql?raw'

describe('admin MFA migration contract', () => {
  it('define comprobaciones AAL2 basadas en el JWT y sin secretos', () => {
    expect(migrationSql).toContain('FUNCTION public.is_aal2()')
    expect(migrationSql).toContain("auth.jwt() ->> 'aal'")
    expect(migrationSql).toContain('FUNCTION public.is_admin_aal2()')
    expect(migrationSql).not.toMatch(/secret|totp_code/i)
  })

  it('protege lectura y mutaciones administrativas con admin más AAL2', () => {
    expect(migrationSql).toMatch(/Admin can read all properties[\s\S]*public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/Admin can update any property[\s\S]*public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/Admin can delete any property[\s\S]*public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/Admins can read all reports[\s\S]*public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/Admins can update all reports[\s\S]*public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/Admins can read property moderation audit[\s\S]*public\.is_admin_aal2\(\)/i)
  })

  it('preserva las ramas de propietario y exige AAL2 en métricas', () => {
    expect(migrationSql).toMatch(/Profiles are readable by owner or admin[\s\S]*id = auth\.uid\(\)[\s\S]*public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/Allow read for owners and admins[\s\S]*properties\.user_id = auth\.uid\(\)[\s\S]*public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toContain('IF NOT public.is_admin_aal2() THEN')
  })
})

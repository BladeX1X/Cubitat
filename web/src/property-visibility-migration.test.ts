import { describe, expect, it } from 'vitest'
import enumMigrationSql from '../supabase/migrations/20260714001000_add_owner_hidden_status.sql?raw'
import migrationSql from '../supabase/migrations/20260714002000_property_visibility_controls.sql?raw'

describe('property visibility controls migration contract', () => {
  it('adds a dedicated owner-hidden state and permits owners to store it', () => {
    expect(enumMigrationSql).toContain("ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'owner_hidden'")
    expect(migrationSql).toContain("'owner_hidden'::public.property_status")
    expect(migrationSql).toContain('auth.uid() = user_id')
    expect(migrationSql).toContain('FUNCTION public.hide_own_property')
    expect(migrationSql).toContain('FUNCTION public.restore_own_property')
  })

  it('allows only the owner to enter or leave owner_hidden', () => {
    expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.guard_owner_hidden_transition()')
    expect(migrationSql).toContain("OLD.status <> 'published'::public.property_status")
    expect(migrationSql).toContain("NEW.status = 'owner_hidden'::public.property_status")
    expect(migrationSql).toContain("OLD.status = 'owner_hidden'::public.property_status")
    expect(migrationSql).toContain("'published'::public.property_status")
    expect(migrationSql).toContain("'pending_review'::public.property_status")
    expect(migrationSql).toContain('auth.uid() IS DISTINCT FROM OLD.user_id')
    expect(migrationSql).toContain('BEFORE UPDATE OF status ON public.properties')
  })

  it('does not trust admin or service roles to restore an owner-hidden row', () => {
    expect(migrationSql).toContain("RAISE EXCEPTION 'Only the property owner can change owner-hidden visibility.'")
    expect(migrationSql).not.toContain('public.is_admin()')
    expect(migrationSql).not.toContain("auth.role() = 'service_role'")
  })
})

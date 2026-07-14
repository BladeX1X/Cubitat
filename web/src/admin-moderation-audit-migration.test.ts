import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/migrations/20260714000000_create_property_moderation_audit.sql?raw'

describe('property moderation audit migration contract', () => {
  it('creates a minimal append-only audit table with bounded evidence', () => {
    expect(migrationSql).toContain('CREATE TABLE public.property_moderation_audit')
    expect(migrationSql).toContain('property_id uuid NOT NULL')
    expect(migrationSql).toContain('property_owner_id uuid')
    expect(migrationSql).toContain('property_title text')
    expect(migrationSql).toContain('changed_fields text[] NOT NULL')
    expect(migrationSql).toContain('CHECK (char_length(property_title) <= 160)')
    expect(migrationSql).not.toContain('REFERENCES public.properties')
  })

  it('allows only admins to select and exposes no client write policy', () => {
    expect(migrationSql).toContain('ALTER TABLE public.property_moderation_audit ENABLE ROW LEVEL SECURITY')
    expect(migrationSql).toContain('FOR SELECT TO authenticated USING (public.is_admin())')
    expect(migrationSql).toContain('REVOKE INSERT, UPDATE, DELETE ON public.property_moderation_audit FROM anon, authenticated')
    expect(migrationSql).not.toMatch(/FOR\s+(INSERT|UPDATE|DELETE)\s+TO\s+(anon|authenticated)/i)
    expect(migrationSql).toContain(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.property_moderation_audit FROM service_role',
    )
    expect(migrationSql).toContain('GRANT SELECT ON TABLE public.property_moderation_audit TO service_role')
  })

  it('supports stable global pagination and restricts changed field names', () => {
    expect(migrationSql).toContain(
      'ON public.property_moderation_audit (created_at DESC, id DESC)',
    )
    expect(migrationSql).toContain(
      "changed_fields <@ ARRAY['status', 'moderation_message', 'deleted']::text[]",
    )
  })

  it('captures status, reason and deletion changes atomically from properties', () => {
    expect(migrationSql).toContain('AFTER UPDATE OF status, moderation_message OR DELETE ON public.properties')
    expect(migrationSql).toContain('OLD.status IS DISTINCT FROM NEW.status')
    expect(migrationSql).toContain('OLD.moderation_message IS DISTINCT FROM NEW.moderation_message')
    expect(migrationSql).toContain("CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'update' END")
    expect(migrationSql).toContain('auth.uid()')
    expect(migrationSql).toContain('auth.role()')
  })

  it('rejects updates and deletes even when row-level security is bypassed', () => {
    expect(migrationSql).toContain('BEFORE UPDATE OR DELETE ON public.property_moderation_audit')
    expect(migrationSql).toContain("RAISE EXCEPTION 'Moderation audit events are immutable.'")
  })

  it('reserves trusted AI moderation for service_role and sets local markers', () => {
    expect(migrationSql).toContain('FUNCTION public.set_property_ai_moderation_trusted')
    expect(migrationSql).toContain("auth.role() IS DISTINCT FROM 'service_role'")
    expect(migrationSql).toContain('p_provider text DEFAULT NULL')
    expect(migrationSql).toContain("p_provider NOT IN ('groq')")
    expect(migrationSql).toContain("WHEN p_provider IS NULL THEN 'system'")
    expect(migrationSql).toContain("ELSE 'automation'")
    expect(migrationSql).toContain("set_config('cubitat.audit_provider', coalesce(p_provider, ''), true)")
    expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.set_property_ai_moderation_trusted')
    expect(migrationSql).toContain('GRANT EXECUTE ON FUNCTION public.set_property_ai_moderation_trusted')
    expect(migrationSql).toContain('TO service_role')
  })

  it('pins security-definer functions to pg_catalog and qualifies application objects', () => {
    expect(migrationSql.match(/SET search_path = pg_catalog/g)).toHaveLength(3)
    expect(migrationSql).toContain('INSERT INTO public.property_moderation_audit')
    expect(migrationSql).toContain('UPDATE public.properties')
    expect(migrationSql).toContain('public.is_admin()')
  })
})

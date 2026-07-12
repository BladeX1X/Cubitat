import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/migrations/20260712000000_create_admin_metrics_rpc.sql?raw'

describe('admin metrics migration contract', () => {
  it('exige rol admin antes de calcular métricas operativas', () => {
    expect(migrationSql).toContain('IF NOT public.is_admin() THEN')
    expect(migrationSql).toContain("RAISE EXCEPTION 'Admin access required.'")
  })

  it('calcula base de datos, storage y conteos sin exponer filas', () => {
    expect(migrationSql).toContain('pg_database_size(current_database())')
    expect(migrationSql).toContain('FROM storage.objects')
    expect(migrationSql).toContain("WHERE bucket_id = 'property_images'")
    expect(migrationSql).toContain("'properties_count'")
    expect(migrationSql).toContain("'users_count'")
    expect(migrationSql).toContain("'reports_count'")
  })

  it('revoca acceso público y permite ejecución autenticada', () => {
    expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.get_admin_metrics() FROM PUBLIC')
    expect(migrationSql).toContain('GRANT EXECUTE ON FUNCTION public.get_admin_metrics() TO authenticated')
  })
})

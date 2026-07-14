import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/migrations/20260713000000_security_hardening.sql?raw'

describe('security hardening migration', () => {
  it('limits property images and avatars to bounded WebP uploads', () => {
    expect(migrationSql).toContain("UPDATE storage.buckets")
    expect(migrationSql).toContain("id = 'property_images'")
    expect(migrationSql).toContain("'image/webp'")
    expect(migrationSql).toContain("'avatars'")
    expect(migrationSql).toContain('file_size_limit')
    expect(migrationSql).toContain('allowed_mime_types')
  })

  it('isolates avatar writes to the authenticated user folder', () => {
    expect(migrationSql).toContain("bucket_id = 'avatars'")
    expect(migrationSql).toContain("(storage.foldername(name))[1] = auth.uid()::text")
  })

  it('corrects the volatility classification of the metrics function', () => {
    expect(migrationSql).toContain('ALTER FUNCTION public.get_admin_metrics() VOLATILE')
  })
})

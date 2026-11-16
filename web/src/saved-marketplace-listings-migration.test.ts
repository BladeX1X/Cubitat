import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/migrations/20261116100000_phase4_saved_marketplace_listings.sql?raw'

describe('saved marketplace listings migration', () => {
  it('stores one service or material favorite per user with duplicate protection', () => {
    expect(migrationSql).toMatch(/CREATE TABLE public\.saved_marketplace_listings/i)
    expect(migrationSql).toMatch(/service_provider_id uuid REFERENCES public\.home_service_providers\(id\) ON DELETE CASCADE/i)
    expect(migrationSql).toMatch(/material_listing_id uuid REFERENCES public\.material_listings\(id\) ON DELETE CASCADE/i)
    expect(migrationSql).toMatch(/CHECK \(\(service_provider_id IS NOT NULL\) <> \(material_listing_id IS NOT NULL\)\)/i)
    expect(migrationSql).toMatch(/CREATE UNIQUE INDEX saved_marketplace_listings_service_unique[\s\S]*WHERE service_provider_id IS NOT NULL/i)
    expect(migrationSql).toMatch(/CREATE UNIQUE INDEX saved_marketplace_listings_material_unique[\s\S]*WHERE material_listing_id IS NOT NULL/i)
  })

  it('keeps rows private and permits only owner-scoped reads, inserts, and deletes', () => {
    expect(migrationSql).toMatch(/ENABLE ROW LEVEL SECURITY/i)
    expect(migrationSql).toMatch(/REVOKE ALL ON TABLE public\.saved_marketplace_listings FROM PUBLIC, anon/i)
    expect(migrationSql).toMatch(/GRANT SELECT, INSERT, DELETE[\s\S]*TO authenticated/i)
    expect(migrationSql).toMatch(/FOR SELECT TO authenticated[\s\S]*user_id = \(SELECT auth\.uid\(\)\)/i)
    expect(migrationSql).toMatch(/FOR INSERT TO authenticated[\s\S]*user_id = \(SELECT auth\.uid\(\)\)/i)
    expect(migrationSql).toMatch(/FOR DELETE TO authenticated[\s\S]*user_id = \(SELECT auth\.uid\(\)\)/i)
  })
})

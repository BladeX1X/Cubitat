import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/dev-migrations/20261013130000_phase4_service_reviews.sql?raw'

describe('F4-REV migration security contract', () => {
  it('stores reviews separately from service-provider data and limits public reads', () => {
    expect(migrationSql).toMatch(/CREATE TABLE public\.home_service_reviews/i)
    expect(migrationSql).toMatch(/CREATE TABLE public\.home_service_review_flags/i)
    expect(migrationSql).toMatch(/home_service_reviews_public_read[\s\S]*USING \(status = 'published'\)/i)
    expect(migrationSql).toMatch(/GRANT SELECT \(id, provider_id, rating, title, body, status, created_at, updated_at\)[\s\S]*TO anon, authenticated/i)
    expect(migrationSql).not.toMatch(/GRANT SELECT ON public\.home_service_reviews TO anon/i)
    expect(migrationSql).not.toMatch(/ALTER TABLE public\.home_service_providers/i)
  })

  it('prevents self-reviews, requires authentication and enforces one active review per author/provider', () => {
    expect(migrationSql).toMatch(/guard_home_service_review_submission[\s\S]*NEW\.author_id <> \(SELECT auth\.uid\(\)\)/i)
    expect(migrationSql).toMatch(/v_owner_id = NEW\.author_id/i)
    expect(migrationSql).toMatch(/CREATE UNIQUE INDEX home_service_reviews_one_active_author_provider_idx/i)
    expect(migrationSql).toMatch(/FUNCTION public\.submit_home_service_review[\s\S]*auth\.uid\(\)/i)
  })

  it('keeps reports private and requires AAL2 for queue, moderation and resolution', () => {
    expect(migrationSql).toMatch(/home_service_review_flags_actor_read[\s\S]*actor_id = \(SELECT auth\.uid\(\)\)/i)
    expect(migrationSql).toMatch(/FUNCTION public\.get_admin_home_service_review_flags\(\)[\s\S]*IF NOT public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/FUNCTION public\.moderate_home_service_review[\s\S]*IF NOT public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/FUNCTION public\.resolve_home_service_review_flag[\s\S]*IF NOT public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/home_service_review_moderation_audit[\s\S]*actor_id uuid/i)
  })
})

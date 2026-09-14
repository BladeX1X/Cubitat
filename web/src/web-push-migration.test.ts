import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/migrations/20260911010000_add_web_push.sql?raw'
import claimLimitFixSql from '../supabase/migrations/20260911020000_fix_push_claim_limit.sql?raw'
import claimBoundFixSql from '../supabase/migrations/20260911030000_fix_push_claim_bound.sql?raw'

describe('web push migration contract', () => {
  it('isolates subscriptions by user and queues one delivery per device', () => {
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS public.push_subscriptions')
    expect(migrationSql).toContain('ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY')
    expect(migrationSql).toContain('auth.uid() = user_id')
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS public.notification_push_deliveries')
    expect(migrationSql).toContain('UNIQUE (notification_id, subscription_id)')
    expect(migrationSql).toContain('AFTER INSERT ON public.notifications')
  })

  it('claims deliveries atomically and reserves execution for service_role', () => {
    expect(migrationSql).toContain('FOR UPDATE SKIP LOCKED')
    expect(claimLimitFixSql).toContain('COALESCE(p_limit, 50)')
    expect(claimLimitFixSql).not.toContain('pg_catalog.coalesce')
    expect(claimBoundFixSql).toContain('WHEN p_limit IS NULL THEN 50')
    expect(claimBoundFixSql).toContain('WHEN p_limit > 100 THEN 100')
    expect(claimBoundFixSql).not.toContain('pg_catalog.least')
    expect(claimBoundFixSql).not.toContain('pg_catalog.greatest')
    expect(migrationSql).toContain('claim_pending_push_deliveries')
    expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.claim_pending_push_deliveries(integer) FROM PUBLIC')
    expect(migrationSql).toContain('GRANT EXECUTE ON FUNCTION public.claim_pending_push_deliveries(integer) TO service_role')
  })
})

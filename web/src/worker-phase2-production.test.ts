import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authenticateImageHashRequest: vi.fn(),
  backfillPropertyImageDuplicates: vi.fn().mockResolvedValue(undefined),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  dispatchPendingPushNotifications: vi.fn().mockResolvedValue({ scanned: 0, sent: 0, failed: 0 }),
  loadOwnedPropertyForImageHashing: vi.fn(),
  purgeApprovedKycEvidence: vi.fn().mockResolvedValue({ scanned: 0, deleted: 0, failed: 0 }),
  refreshPropertyImageDuplicates: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./worker', () => ({
  checkRateLimit: mocks.checkRateLimit,
  createWorker: vi.fn(() => ({ fetch: vi.fn() })),
}))
vi.mock('./worker/push-notifications', () => ({ dispatchPendingPushNotifications: mocks.dispatchPendingPushNotifications }))
vi.mock('./worker/kyc-evidence-retention', () => ({ purgeApprovedKycEvidence: mocks.purgeApprovedKycEvidence }))
vi.mock('./worker/logger', () => ({ logWorkerEvent: vi.fn() }))
vi.mock('./worker/image-phash', () => ({
  authenticateImageHashRequest: mocks.authenticateImageHashRequest,
  backfillPropertyImageDuplicates: mocks.backfillPropertyImageDuplicates,
  loadOwnedPropertyForImageHashing: mocks.loadOwnedPropertyForImageHashing,
  refreshPropertyImageDuplicates: mocks.refreshPropertyImageDuplicates,
}))

const env = {
  VITE_SUPABASE_URL: 'https://tohjzoncoosvjbjcakdl.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'public-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'worker-secret',
  RATE_LIMITER: { idFromName: vi.fn(), get: vi.fn() },
}

describe('Phase 2 production Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkRateLimit.mockResolvedValue({ allowed: true })
  })

  it('keeps image hashing disabled unless the production flag is explicitly enabled', async () => {
    const { default: worker } = await import('./worker-phase2-production')
    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/phase2/property-image-duplicates', { method: 'POST', body: '{}' }),
      env as never,
      { waitUntil: vi.fn() } as never,
    )

    expect(response.status).toBe(404)
    expect(mocks.authenticateImageHashRequest).not.toHaveBeenCalled()
  })

  it('accepts hashing only for an authenticated owner after rate limiting', async () => {
    mocks.authenticateImageHashRequest.mockResolvedValue('owner-id')
    mocks.loadOwnedPropertyForImageHashing.mockResolvedValue({ id: 'property-id', user_id: 'owner-id' })
    const { default: worker } = await import('./worker-phase2-production')
    const waitUntil = vi.fn()
    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/phase2/property-image-duplicates', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer user-session' },
        body: JSON.stringify({ property_id: '123e4567-e89b-12d3-a456-426614174000' }),
      }),
      { ...env, PHASE2_IMAGE_DUPLICATES_ENABLED: 'true' } as never,
      { waitUntil } as never,
    )

    expect(response.status).toBe(202)
    expect(mocks.checkRateLimit).toHaveBeenCalledOnce()
    expect(mocks.loadOwnedPropertyForImageHashing).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000', 'owner-id', expect.anything(),
    )
    expect(mocks.refreshPropertyImageDuplicates).toHaveBeenCalledOnce()
    expect(waitUntil).toHaveBeenCalledOnce()
  })

  it('does not backfill production images until the flag is enabled', async () => {
    const { runProductionScheduledTasks } = await import('./worker-phase2-production')
    const waitUntil = vi.fn((task: Promise<unknown>) => task)

    runProductionScheduledTasks(env as never, { waitUntil } as never)
    await Promise.all(waitUntil.mock.calls.map(([task]) => task))
    expect(mocks.backfillPropertyImageDuplicates).not.toHaveBeenCalled()

    runProductionScheduledTasks({ ...env, PHASE2_IMAGE_DUPLICATES_ENABLED: 'true' } as never, { waitUntil } as never)
    await Promise.all(waitUntil.mock.calls.slice(1).map(([task]) => task))
    expect(mocks.backfillPropertyImageDuplicates).toHaveBeenCalledOnce()
  })
})

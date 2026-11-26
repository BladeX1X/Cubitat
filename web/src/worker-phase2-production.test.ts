import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authenticateImageHashRequest: vi.fn(),
  backfillPropertyImageDuplicates: vi.fn().mockResolvedValue(undefined),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  dispatchPendingPushNotifications: vi.fn().mockResolvedValue({ scanned: 0, sent: 0, failed: 0 }),
  dispatchPendingAgentApplicationEmails: vi.fn().mockResolvedValue({ claimed: 0, sent: 0, failed: 0 }),
  handleAgentApplicationSubmission: vi.fn().mockResolvedValue(new Response('{"id":"application-id"}', { status: 201 })),
  handleAgentApplicationDocumentLinks: vi.fn().mockResolvedValue(new Response('{"cv_url":"signed"}', { status: 200 })),
  loadOwnedPropertyForImageHashing: vi.fn(),
  purgeApprovedKycEvidence: vi.fn().mockResolvedValue({ scanned: 0, deleted: 0, failed: 0 }),
  purgeFinalAgentApplicationEvidence: vi.fn().mockResolvedValue({ claimed: 0, purged: 0, failed: 0 }),
  refreshPropertyImageDuplicates: vi.fn().mockResolvedValue(undefined),
  createWorkerOptions: vi.fn(),
}))

vi.mock('./worker', () => ({
  checkRateLimit: mocks.checkRateLimit,
  createWorker: vi.fn((options) => {
    mocks.createWorkerOptions(options)
    return { fetch: vi.fn() }
  }),
}))
vi.mock('./worker/push-notifications', () => ({ dispatchPendingPushNotifications: mocks.dispatchPendingPushNotifications }))
vi.mock('./worker/agent-applications', () => ({ handleAgentApplicationSubmission: mocks.handleAgentApplicationSubmission }))
vi.mock('./worker/agent-application-documents', () => ({ handleAgentApplicationDocumentLinks: mocks.handleAgentApplicationDocumentLinks }))
vi.mock('./worker/agent-application-email-dispatcher', () => ({ dispatchPendingAgentApplicationEmails: mocks.dispatchPendingAgentApplicationEmails }))
vi.mock('./worker/agent-application-evidence-retention', () => ({ purgeFinalAgentApplicationEvidence: mocks.purgeFinalAgentApplicationEvidence }))
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
    mocks.authenticateImageHashRequest.mockReset()
    mocks.handleAgentApplicationSubmission.mockClear()
    mocks.handleAgentApplicationDocumentLinks.mockClear()
    mocks.dispatchPendingAgentApplicationEmails.mockClear()
    mocks.purgeFinalAgentApplicationEvidence.mockClear()
  })

  it('allows the audited agent moderation RPCs through the authenticated proxy', async () => {
    await import('./worker-phase2-production')
    const options = mocks.createWorkerOptions.mock.calls.at(-1)?.[0] as {
      additionalAuthenticatedRpcs: string[]
      additionalAuthenticatedWriteTables: string[]
    }
    expect(options.additionalAuthenticatedRpcs).toContain('list_active_agents_for_moderation')
    expect(options.additionalAuthenticatedRpcs).toContain('revoke_agent_access')
    expect(options.additionalAuthenticatedRpcs).toContain('review_agent_application')
    expect(options.additionalAuthenticatedRpcs).toContain('get_admin_property_contact_details')
    expect(options.additionalAuthenticatedRpcs).toContain('get_own_agent_acquisition_metrics')
    expect(options.additionalAuthenticatedRpcs).toContain('attribute_own_oauth_agent_signup')
    expect(options.additionalAuthenticatedWriteTables).toContain('saved_marketplace_listings')
  })

  it('keeps Phase 3 application endpoints disabled in production by default', async () => {
    const { default: worker } = await import('./worker-phase2-production')
    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/phase3/agent-applications', { method: 'POST' }),
      env as never,
      { waitUntil: vi.fn() } as never,
    )
    expect(response.status).toBe(404)
    expect(mocks.authenticateImageHashRequest).not.toHaveBeenCalled()
  })

  it('authenticates and rate limits production application submissions when enabled', async () => {
    mocks.authenticateImageHashRequest.mockResolvedValue('applicant-id')
    const { default: worker } = await import('./worker-phase2-production')
    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/phase3/agent-applications', {
        method: 'POST', headers: { authorization: 'Bearer user-session' },
      }),
      { ...env, PHASE3_ENABLED: 'true' } as never,
      { waitUntil: vi.fn() } as never,
    )
    expect(response.status).toBe(201)
    expect(mocks.checkRateLimit).toHaveBeenCalledOnce()
    expect(mocks.handleAgentApplicationSubmission).toHaveBeenCalledOnce()
  })

  it('serves private application document links only when enabled and rate limited', async () => {
    const { default: worker } = await import('./worker-phase2-production')
    const request = new Request('https://cubitathome.com/api/phase3/agent-applications/application-id/documents', {
      method: 'GET', headers: { authorization: 'Bearer admin-session' },
    })
    const disabled = await worker.fetch(request, env as never, { waitUntil: vi.fn() } as never)
    expect(disabled.status).toBe(404)

    mocks.authenticateImageHashRequest.mockResolvedValue('admin-id')
    const enabled = await worker.fetch(
      request,
      { ...env, PHASE3_ENABLED: 'true' } as never,
      { waitUntil: vi.fn() } as never,
    )
    expect(enabled.status).toBe(200)
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      { ...env, PHASE3_ENABLED: 'true' },
      'user:admin-id:agent-application-documents:v1',
      10,
      10 * 60 * 1000,
    )
    expect(mocks.handleAgentApplicationDocumentLinks).toHaveBeenCalledOnce()
  })

  it('does not schedule Phase 3 email or purge work unless explicitly enabled', async () => {
    const { runProductionScheduledTasks } = await import('./worker-phase2-production')
    const waitUntil = vi.fn((task: Promise<unknown>) => task)
    runProductionScheduledTasks(env as never, { waitUntil } as never)
    await Promise.all(waitUntil.mock.calls.map(([task]) => task))
    expect(mocks.dispatchPendingAgentApplicationEmails).not.toHaveBeenCalled()
    expect(mocks.purgeFinalAgentApplicationEvidence).not.toHaveBeenCalled()

    runProductionScheduledTasks({ ...env, PHASE3_ENABLED: 'true' } as never, { waitUntil } as never)
    await Promise.all(waitUntil.mock.calls.slice(1).map(([task]) => task))
    expect(mocks.dispatchPendingAgentApplicationEmails).toHaveBeenCalledOnce()
    expect(mocks.purgeFinalAgentApplicationEvidence).toHaveBeenCalledOnce()
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

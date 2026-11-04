import { beforeEach, describe, expect, it, vi } from 'vitest'

const dispatchPendingAlertEmails = vi.fn().mockResolvedValue({ scanned: 0, sent: 0, failed: 0 })
const dispatchPendingPushNotifications = vi.fn().mockResolvedValue({ scanned: 0, sent: 0, failed: 0 })
const purgeApprovedKycEvidence = vi.fn().mockResolvedValue({ scanned: 0, deleted: 0, failed: 0 })
const backfillPropertyImageDuplicates = vi.fn().mockResolvedValue(undefined)
const authenticateImageHashRequest = vi.fn()
const handleAgentApplicationSubmission = vi.fn().mockResolvedValue(new Response('{"id":"application-id","status":"submitted"}', { status: 201 }))
const handleAgentApplicationDocumentLinks = vi.fn().mockResolvedValue(new Response('{"cv_url":"signed"}', { status: 200 }))
const dispatchPendingAgentApplicationEmails = vi.fn().mockResolvedValue({ claimed: 0, sent: 0, failed: 0 })
const purgeFinalAgentApplicationEvidence = vi.fn().mockResolvedValue({ claimed: 0, purged: 0, failed: 0 })

vi.mock('./worker/alert-email-dispatcher', () => ({ dispatchPendingAlertEmails }))
vi.mock('./worker/push-notifications', async () => {
  const actual = await vi.importActual<typeof import('./worker/push-notifications')>('./worker/push-notifications')
  return { ...actual, dispatchPendingPushNotifications }
})
vi.mock('./worker/kyc-evidence-retention', () => ({ purgeApprovedKycEvidence }))
vi.mock('./worker/image-phash', () => ({
  authenticateImageHashRequest,
  backfillPropertyImageDuplicates,
  loadOwnedPropertyForImageHashing: vi.fn(),
  refreshPropertyImageDuplicates: vi.fn(),
}))
vi.mock('./worker/agent-applications', () => ({ handleAgentApplicationSubmission }))
vi.mock('./worker/agent-application-documents', () => ({ handleAgentApplicationDocumentLinks }))
vi.mock('./worker/agent-application-email-dispatcher', () => ({ dispatchPendingAgentApplicationEmails }))
vi.mock('./worker/agent-application-evidence-retention', () => ({ purgeFinalAgentApplicationEvidence }))

describe('Phase 2 DEV scheduled tasks', () => {
  beforeEach(() => {
    dispatchPendingAlertEmails.mockClear()
    dispatchPendingPushNotifications.mockClear()
    purgeApprovedKycEvidence.mockClear()
    backfillPropertyImageDuplicates.mockClear()
    dispatchPendingAgentApplicationEmails.mockClear()
    purgeFinalAgentApplicationEvidence.mockClear()
  })

  it('dispatches push notifications alongside the other Phase 2 jobs', async () => {
    const { runPhase2ScheduledTasks } = await import('./worker-phase2-dev')
    const waitUntil = vi.fn()

    runPhase2ScheduledTasks({} as never, { waitUntil })
    await waitUntil.mock.calls[0]?.[0]

    expect(dispatchPendingAlertEmails).toHaveBeenCalledOnce()
    expect(dispatchPendingPushNotifications).toHaveBeenCalledOnce()
    expect(purgeApprovedKycEvidence).toHaveBeenCalledOnce()
    expect(backfillPropertyImageDuplicates).toHaveBeenCalledOnce()
    expect(dispatchPendingAgentApplicationEmails).not.toHaveBeenCalled()
    expect(purgeFinalAgentApplicationEvidence).not.toHaveBeenCalled()
  })

  it('runs agent application email dispatch only while Phase 3 is explicitly enabled', async () => {
    const { runPhase2ScheduledTasks } = await import('./worker-phase2-dev')
    const waitUntil = vi.fn()

    runPhase2ScheduledTasks({ PHASE3_ENABLED: 'true' } as never, { waitUntil })
    await waitUntil.mock.calls[0]?.[0]

    expect(dispatchPendingAgentApplicationEmails).toHaveBeenCalledOnce()
    expect(purgeFinalAgentApplicationEvidence).toHaveBeenCalledOnce()
  })

  it('proxies the public verified-seller identifiers RPC in DEV', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[{"id":"seller-qa"}]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { default: worker } = await import('./worker-phase2-dev')

    const response = await worker.fetch(
      new Request('https://cubitat1-phase2-dev.workers.dev/api/supabase/rest/v1/rpc/get_verified_seller_ids', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer dummy-key-safe-from-browsers',
          apikey: 'anon-key',
          'Content-Type': 'application/json',
        },
        body: '{}',
      }),
      {
        PHASE2_ENABLED: 'true',
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'anon-key',
        RATE_LIMITER: {
          idFromName: vi.fn(() => 'global'),
          get: vi.fn(() => ({
            fetch: vi.fn().mockResolvedValue(new Response('{"allowed":true}', { status: 200 })),
          })),
        },
      } as never,
      { waitUntil: vi.fn() } as never,
    )

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://project.supabase.co/rest/v1/rpc/get_verified_seller_ids')
  })

  it('proxies agent application review only with an authenticated session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"status":"reviewing"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { default: worker } = await import('./worker-phase2-dev')
    const env = {
      PHASE2_ENABLED: 'true',
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
      RATE_LIMITER: {
        idFromName: vi.fn(() => 'global'),
        get: vi.fn(() => ({ fetch: vi.fn().mockResolvedValue(new Response('{"allowed":true}', { status: 200 })) })),
      },
    }

    const authenticatedResponse = await worker.fetch(
      new Request('https://cubitat1-phase2-dev.workers.dev/api/supabase/rest/v1/rpc/review_agent_application', {
        method: 'POST',
        headers: { Authorization: 'Bearer admin-jwt', apikey: 'anon-key', 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_application_id: 'application-id', p_action: 'start_review' }),
      }),
      env as never,
      { waitUntil: vi.fn() } as never,
    )

    const anonymousResponse = await worker.fetch(
      new Request('https://cubitat1-phase2-dev.workers.dev/api/supabase/rest/v1/rpc/review_agent_application', {
        method: 'POST',
        headers: { Authorization: 'Bearer dummy-key-safe-from-browsers', apikey: 'anon-key', 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_application_id: 'application-id', p_action: 'start_review' }),
      }),
      env as never,
      { waitUntil: vi.fn() } as never,
    )

    expect(authenticatedResponse.status).toBe(200)
    await expect(authenticatedResponse.json()).resolves.toEqual({ status: 'reviewing' })
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://project.supabase.co/rest/v1/rpc/review_agent_application')
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe('Bearer admin-jwt')
    expect(anonymousResponse.status).toBe(403)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})

describe('Phase 3 DEV agent application route', () => {
  beforeEach(() => {
    authenticateImageHashRequest.mockReset()
    handleAgentApplicationSubmission.mockClear()
    handleAgentApplicationDocumentLinks.mockClear()
  })

  it('keeps the application endpoint closed unless explicitly enabled', async () => {
    const { default: worker } = await import('./worker-phase2-dev')
    const response = await worker.fetch(
      new Request('https://cubitat1-phase2-dev.workers.dev/api/phase3/agent-applications', { method: 'POST' }),
      { PHASE3_ENABLED: 'false' } as never,
      { waitUntil: vi.fn() } as never,
    )

    expect(response.status).toBe(404)
    expect(authenticateImageHashRequest).not.toHaveBeenCalled()
  })

  it('authenticates and rate limits an enabled application submission before handling the body', async () => {
    authenticateImageHashRequest.mockResolvedValue('applicant-id')
    const rateLimitFetch = vi.fn().mockResolvedValue(new Response('{"allowed":true,"remaining":1,"resetAt":0}'))
    const { default: worker } = await import('./worker-phase2-dev')
    const response = await worker.fetch(
      new Request('https://cubitat1-phase2-dev.workers.dev/api/phase3/agent-applications', {
        method: 'POST',
        headers: { Authorization: 'Bearer user-jwt' },
      }),
      {
        PHASE3_ENABLED: 'true',
        RATE_LIMITER: { idFromName: vi.fn(() => 'global'), get: vi.fn(() => ({ fetch: rateLimitFetch })) },
      } as never,
      { waitUntil: vi.fn() } as never,
    )

    expect(response.status).toBe(201)
    expect(authenticateImageHashRequest).toHaveBeenCalledOnce()
    expect(handleAgentApplicationSubmission).toHaveBeenCalledOnce()
    expect(rateLimitFetch).toHaveBeenCalledOnce()
  })

  it('authenticates and rate limits document-link requests before passing them to the AAL2 verifier', async () => {
    authenticateImageHashRequest.mockResolvedValue('admin-id')
    const rateLimitFetch = vi.fn().mockResolvedValue(new Response('{"allowed":true,"remaining":9,"resetAt":0}'))
    const { default: worker } = await import('./worker-phase2-dev')
    const response = await worker.fetch(
      new Request('https://cubitat1-phase2-dev.workers.dev/api/phase3/agent-applications/45c8e993-b64a-4d1c-9e58-20ad1a25eb6b/documents', {
        headers: { Authorization: 'Bearer admin-jwt' },
      }),
      {
        PHASE3_ENABLED: 'true',
        RATE_LIMITER: { idFromName: vi.fn(() => 'global'), get: vi.fn(() => ({ fetch: rateLimitFetch })) },
      } as never,
      { waitUntil: vi.fn() } as never,
    )

    expect(response.status).toBe(200)
    expect(authenticateImageHashRequest).toHaveBeenCalledOnce()
    expect(rateLimitFetch).toHaveBeenCalledOnce()
    expect(handleAgentApplicationDocumentLinks).toHaveBeenCalledOnce()
  })
})

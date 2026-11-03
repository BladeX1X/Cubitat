import { describe, expect, it, vi } from 'vitest'
import { purgeFinalAgentApplicationEvidence } from './agent-application-evidence-retention'

const application = {
  id: '45c8e993-b64a-4d1c-9e58-20ad1a25eb6b',
  user_id: 'f7adba7c-367d-42a8-933a-af01f7f9155a',
  cv_path: 'f7adba7c-367d-42a8-933a-af01f7f9155a/45c8e993-b64a-4d1c-9e58-20ad1a25eb6b/cv-19f16ead-568e-4d3a-8028-eaab5bbbc2f5.pdf',
  diploma_path: 'f7adba7c-367d-42a8-933a-af01f7f9155a/45c8e993-b64a-4d1c-9e58-20ad1a25eb6b/diploma-7c25531e-1279-44ca-a3ed-b642a4b87d37.jpg',
  attempts: 1,
}

const env = {
  PHASE3_ENABLED: 'true',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
}

describe('purgeFinalAgentApplicationEvidence', () => {
  it('does not claim work while Phase 3 is disabled', async () => {
    const fetchFn = vi.fn()
    await expect(purgeFinalAgentApplicationEvidence({ ...env, PHASE3_ENABLED: 'false' }, fetchFn))
      .resolves.toEqual({ claimed: 0, purged: 0, failed: 0 })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('deletes both owned private files and marks the application evidence purged', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([application]), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response('true', { status: 200 }))

    await expect(purgeFinalAgentApplicationEvidence(env, fetchFn))
      .resolves.toEqual({ claimed: 1, purged: 1, failed: 0 })
    expect(fetchFn).toHaveBeenNthCalledWith(1, 'https://project.supabase.co/rest/v1/rpc/claim_agent_application_evidence_for_purge', expect.objectContaining({ method: 'POST' }))
    expect(fetchFn).toHaveBeenNthCalledWith(2, 'https://project.supabase.co/storage/v1/object/agent_application_documents', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ prefixes: [application.cv_path, application.diploma_path] }),
    }))
    expect(fetchFn.mock.calls[2]?.[0]).toBe('https://project.supabase.co/rest/v1/rpc/complete_agent_application_evidence_purge')
  })

  it('releases failed Storage deletions for bounded retries', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([application]), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('true', { status: 200 }))

    await expect(purgeFinalAgentApplicationEvidence(env, fetchFn))
      .resolves.toEqual({ claimed: 1, purged: 0, failed: 1 })
    expect(fetchFn.mock.calls[2]?.[0]).toBe('https://project.supabase.co/rest/v1/rpc/release_agent_application_evidence_purge')
  })

  it('does not send a malformed path to Storage', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([{
      ...application,
      cv_path: '../other-user/private.pdf',
    }]), { status: 200 }))

    await expect(purgeFinalAgentApplicationEvidence(env, fetchFn))
      .resolves.toEqual({ claimed: 0, purged: 0, failed: 0 })
    expect(fetchFn).toHaveBeenCalledOnce()
  })
})

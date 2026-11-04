import { describe, expect, it, vi } from 'vitest'
import { handleAgentApplicationDocumentLinks } from './agent-application-documents'

const env = {
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
}
const id = '45c8e993-b64a-4d1c-9e58-20ad1a25eb6b'
const owner = 'f7adba7c-367d-42a8-933a-af01f7f9155a'
const cvPath = `${owner}/${id}/cv-72b35ff4-8507-4950-ab14-ed1d9dd34042.pdf`
const diplomaPath = `${owner}/${id}/diploma-07bac86e-ec43-41cc-adca-e6f72777b634.jpg`
const request = () => new Request(`https://dev.example/api/phase3/agent-applications/${id}/documents`, {
  headers: { Authorization: 'Bearer user-session' },
})

describe('agent application private document links', () => {
  it('refuses to create any service-role or storage request unless Postgres confirms admin AAL2', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('false', { status: 200 }))
    const response = await handleAgentApplicationDocumentLinks(request(), id, env, fetchFn)

    expect(response.status).toBe(403)
    expect(fetchFn).toHaveBeenCalledOnce()
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain('/rpc/is_admin_aal2')
  })

  it('distinguishes an unavailable database access check from a denied AAL2 session', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('unavailable', { status: 500 }))
    const response = await handleAgentApplicationDocumentLinks(request(), id, env, fetchFn)

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'admin_access_check_unavailable' })
    expect(fetchFn).toHaveBeenCalledOnce()
  })

  it('returns only same-origin signed URLs with a two-minute expiry after AAL2 succeeds', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response('true', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ cv_path: cvPath, diploma_path: diplomaPath }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedURL: `/storage/v1/object/sign/agent_application_documents/${cvPath}?token=cv` }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedURL: `/storage/v1/object/sign/agent_application_documents/${diplomaPath}?token=diploma` }), { status: 200 }))

    const response = await handleAgentApplicationDocumentLinks(request(), id, env, fetchFn)
    const body = await response.json() as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      cv_url: `https://project.supabase.co/storage/v1/object/sign/agent_application_documents/${cvPath}?token=cv`,
      diploma_url: `https://project.supabase.co/storage/v1/object/sign/agent_application_documents/${diplomaPath}?token=diploma`,
      expires_in: 120,
    })
    expect(fetchFn).toHaveBeenCalledTimes(4)
    expect(fetchFn.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer user-session' })
    expect(fetchFn.mock.calls[2]?.[1]?.body).toBe(JSON.stringify({ expiresIn: 120 }))
  })

  it('rejects signed URLs that point outside the configured Supabase origin', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response('true', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ cv_path: cvPath, diploma_path: diplomaPath }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedURL: 'https://attacker.example/storage/v1/object/sign/file?token=x' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedURL: `/storage/v1/object/sign/agent_application_documents/${diplomaPath}?token=y` }), { status: 200 }))

    const response = await handleAgentApplicationDocumentLinks(request(), id, env, fetchFn)
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: 'document_signing_failed' })
  })

  it('reports a storage signing failure without exposing document paths or URLs', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response('true', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ cv_path: cvPath, diploma_path: diplomaPath }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('storage unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response('storage unavailable', { status: 503 }))

    const response = await handleAgentApplicationDocumentLinks(request(), id, env, fetchFn)

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'document_signing_failed' })
  })

  it('returns gone after the retention job has removed document paths', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response('true', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ cv_path: null, diploma_path: null }]), { status: 200 }))

    const response = await handleAgentApplicationDocumentLinks(request(), id, env, fetchFn)
    expect(response.status).toBe(410)
    expect(await response.json()).toMatchObject({ error: 'documents_expired' })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('validates the application id and bearer session before calling upstream', async () => {
    const fetchFn = vi.fn()
    const invalidId = await handleAgentApplicationDocumentLinks(request(), 'not-an-id', env, fetchFn)
    const missingBearer = await handleAgentApplicationDocumentLinks(new Request('https://dev.example'), id, env, fetchFn)

    expect(invalidId.status).toBe(400)
    expect(missingBearer.status).toBe(401)
    expect(fetchFn).not.toHaveBeenCalled()
  })
})

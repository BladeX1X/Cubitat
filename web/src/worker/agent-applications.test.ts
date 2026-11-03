import { describe, expect, it, vi } from 'vitest'
import {
  detectAgentApplicationDocumentMime,
  handleAgentApplicationSubmission,
  inspectAgentApplicationDocument,
} from './agent-applications'

describe('agent application document inspection', () => {
  it('detects PDF from its signature instead of the client MIME type', () => {
    expect(detectAgentApplicationDocumentMime(new TextEncoder().encode('%PDF-1.7\n'))).toBe('application/pdf')
  })

  it('detects JPEG and PNG signatures', () => {
    expect(detectAgentApplicationDocumentMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('image/jpeg')
    expect(detectAgentApplicationDocumentMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png')
  })

  it('rejects truncated or unsupported bytes even if the browser claimed a supported type', () => {
    expect(detectAgentApplicationDocumentMime(new Uint8Array([0xff, 0xd8]))).toBeNull()
    expect(detectAgentApplicationDocumentMime(new TextEncoder().encode('<svg></svg>'))).toBeNull()
    expect(detectAgentApplicationDocumentMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBeNull()
  })

  it('enforces the per-file byte limit before upload', () => {
    expect(inspectAgentApplicationDocument(new Uint8Array(0))).toMatchObject({ ok: false, reason: 'empty' })
    const maximumPdf = new Uint8Array(10 * 1024 * 1024)
    maximumPdf.set(new TextEncoder().encode('%PDF-1.7'))
    expect(inspectAgentApplicationDocument(maximumPdf)).toMatchObject({ ok: true, mime: 'application/pdf', extension: 'pdf' })
    expect(inspectAgentApplicationDocument(new Uint8Array(10 * 1024 * 1024 + 1))).toMatchObject({ ok: false, reason: 'too_large' })
    expect(inspectAgentApplicationDocument(new TextEncoder().encode('%PDF-1.7'))).toMatchObject({ ok: true, mime: 'application/pdf', extension: 'pdf' })
  })
})

function applicationForm(): FormData {
  const form = new FormData()
  form.set('province', 'La Habana')
  form.set('education_title', 'Licenciatura en Administración')
  form.set('experience_summary', 'Gestión de procesos')
  form.set('cv', new File([new TextEncoder().encode('%PDF-1.7\ncv')], 'personal-name-cv.pdf', { type: 'text/plain' }))
  form.set('diploma', new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])], 'degree.png', { type: 'image/png' }))
  return form
}

const baseEnv = {
  PHASE3_ENABLED: 'true',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'public-test-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
}

describe('agent application submission endpoint', () => {
  it('stores signature-validated documents privately and persists only server-derived paths', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('"application-id"', { status: 200 }))
    const request = new Request('https://dev.example/api/phase3/agent-applications', {
      method: 'POST',
      body: applicationForm(),
    })

    const response = await handleAgentApplicationSubmission(request, baseEnv, 'applicant-id', fetchFn)
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ status: 'submitted' })
    expect(fetchFn).toHaveBeenCalledTimes(3)
    expect(String(fetchFn.mock.calls[0]?.[0])).toMatch(/storage\/v1\/object\/agent_application_documents\/applicant-id\//)
    expect(String(fetchFn.mock.calls[1]?.[0])).toMatch(/storage\/v1\/object\/agent_application_documents\/applicant-id\//)
    const rpcCall = fetchFn.mock.calls[2]![1] as RequestInit
    expect(String(fetchFn.mock.calls[2]?.[0])).toContain('/rest/v1/rpc/submit_agent_application_trusted')
    expect(JSON.parse(String(rpcCall.body))).toMatchObject({
      p_user_id: 'applicant-id',
      p_province: 'La Habana',
      p_education_title: 'Licenciatura en Administración',
    })
    expect(JSON.stringify(JSON.parse(String(rpcCall.body)))).not.toContain('personal-name-cv.pdf')
    expect((fetchFn.mock.calls[0]![1] as RequestInit).headers).toMatchObject({ 'Content-Type': 'application/pdf' })
  })

  it('rejects an invalid document before sending anything to Storage', async () => {
    const fetchFn = vi.fn()
    const form = applicationForm()
    form.set('cv', new File(['not a pdf'], 'claimed.pdf', { type: 'application/pdf' }))
    const request = new Request('https://dev.example/api/phase3/agent-applications', { method: 'POST', body: form })

    const response = await handleAgentApplicationSubmission(request, baseEnv, 'applicant-id', fetchFn)
    expect(response.status).toBe(400)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('removes uploaded files if persistence fails', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('database unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    const request = new Request('https://dev.example/api/phase3/agent-applications', { method: 'POST', body: applicationForm() })

    const response = await handleAgentApplicationSubmission(request, baseEnv, 'applicant-id', fetchFn)
    expect(response.status).toBe(503)
    expect(fetchFn).toHaveBeenCalledTimes(4)
    expect(String(fetchFn.mock.calls[3]![0])).toContain('/storage/v1/object/agent_application_documents')
    expect((fetchFn.mock.calls[3]![1] as RequestInit).method).toBe('DELETE')
  })
})

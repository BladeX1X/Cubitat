import { describe, expect, it, vi } from 'vitest'
import { dispatchPendingAgentApplicationEmails } from './agent-application-email-dispatcher'

const application = {
  id: 'ff3a23ef-64a3-4750-8e66-1572a9794931',
  application_id: '45c8e993-b64a-4d1c-9e58-20ad1a25eb6b',
  user_id: 'f7adba7c-367d-42a8-933a-af01f7f9155a',
  province: 'La Habana',
  education_title: 'Licenciatura en Derecho <QA>',
  cv_path: 'f7adba7c-367d-42a8-933a-af01f7f9155a/45c8e993-b64a-4d1c-9e58-20ad1a25eb6b/cv-19f16ead-568e-4d3a-8028-eaab5bbbc2f5.pdf',
  diploma_path: 'f7adba7c-367d-42a8-933a-af01f7f9155a/45c8e993-b64a-4d1c-9e58-20ad1a25eb6b/diploma-7c25531e-1279-44ca-a3ed-b642a4b87d37.jpg',
  created_at: '2026-11-03T19:00:00.000Z',
  attempts: 1,
}

const env = {
  PHASE3_ENABLED: 'true',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
  RESEND_API_KEY: 'resend-test',
  ALERT_EMAIL_FROM: 'Cubitat DEV <onboarding@resend.dev>',
  AGENT_APPLICATION_EMAIL_TO: 'qa@example.com',
}

describe('dispatchPendingAgentApplicationEmails', () => {
  it('stays inert unless Phase 3 is explicitly enabled', async () => {
    const fetchFn = vi.fn()
    await expect(dispatchPendingAgentApplicationEmails({ ...env, PHASE3_ENABLED: 'false' }, fetchFn))
      .resolves.toEqual({ claimed: 0, sent: 0, failed: 0 })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('sends no attachments and mails short-lived same-project signed links idempotently', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([application]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedURL: '/object/sign/agent_application_documents/cv?token=cv-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedURL: '/object/sign/agent_application_documents/diploma?token=diploma-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{"id":"resend-id"}', { status: 200 }))
      .mockResolvedValueOnce(new Response('true', { status: 200 }))

    await expect(dispatchPendingAgentApplicationEmails(env, fetchFn)).resolves.toEqual({ claimed: 1, sent: 1, failed: 0 })

    expect(fetchFn).toHaveBeenNthCalledWith(1, 'https://project.supabase.co/rest/v1/rpc/claim_pending_agent_application_emails', expect.objectContaining({ method: 'POST' }))
    expect(fetchFn).toHaveBeenNthCalledWith(2, expect.stringContaining('/storage/v1/object/sign/agent_application_documents/'), expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ expiresIn: 600 }),
    }))
    const emailCall = fetchFn.mock.calls[3]
    const body = JSON.parse(String(emailCall?.[1]?.body)) as Record<string, unknown>
    expect(emailCall?.[0]).toBe('https://api.resend.com/emails')
    expect(emailCall?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer resend-test',
      'Idempotency-Key': `cubitat-agent-application/${application.id}`,
    })
    expect(body).toMatchObject({ from: env.ALERT_EMAIL_FROM, to: [env.AGENT_APPLICATION_EMAIL_TO] })
    expect(body).not.toHaveProperty('attachments')
    expect(body.html).toContain('cv-token')
    expect(body.html).toContain('diploma-token')
    expect(body.html).toContain('&lt;QA&gt;')
    expect(fetchFn.mock.calls[4]?.[0]).toBe('https://project.supabase.co/rest/v1/rpc/complete_agent_application_email')
    expect(String(fetchFn.mock.calls[4]?.[1]?.body)).toContain(application.id)
  })

  it('rejects signed document URLs that point outside the configured Supabase origin', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([application]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedURL: 'https://attacker.example/storage/v1/object/sign/agent_application_documents/cv?token=x' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedURL: '/object/sign/agent_application_documents/diploma?token=y' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('true', { status: 200 }))

    await expect(dispatchPendingAgentApplicationEmails(env, fetchFn)).resolves.toEqual({ claimed: 1, sent: 0, failed: 1 })
    expect(fetchFn).toHaveBeenCalledTimes(4)
    expect(fetchFn.mock.calls[3]?.[0]).toBe('https://project.supabase.co/rest/v1/rpc/release_agent_application_email')
  })

  it('releases a malformed claimed row instead of leaving it locked for the stale-claim timeout', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: application.id, cv_path: '../unexpected.pdf' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('true', { status: 200 }))

    await expect(dispatchPendingAgentApplicationEmails(env, fetchFn)).resolves.toEqual({ claimed: 0, sent: 0, failed: 0 })
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(fetchFn.mock.calls[1]?.[0]).toBe('https://project.supabase.co/rest/v1/rpc/release_agent_application_email')
    expect(String(fetchFn.mock.calls[1]?.[1]?.body)).toContain(application.id)
  })

  it('does not send email or claim work when the recipient configuration is missing', async () => {
    const fetchFn = vi.fn()
    await expect(dispatchPendingAgentApplicationEmails({ ...env, AGENT_APPLICATION_EMAIL_TO: '' }, fetchFn))
      .resolves.toEqual({ claimed: 0, sent: 0, failed: 0 })
    expect(fetchFn).not.toHaveBeenCalled()
  })
})

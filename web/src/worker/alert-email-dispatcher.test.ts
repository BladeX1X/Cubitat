import { describe, expect, it, vi } from 'vitest'
import { dispatchPendingAlertEmails } from './alert-email-dispatcher'

const env = {
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
  RESEND_API_KEY: 'resend-test',
}

describe('dispatchPendingAlertEmails', () => {
  it('does not access the network when server-only secrets are unavailable', async () => {
    const fetchFn = vi.fn()
    await expect(dispatchPendingAlertEmails({ VITE_SUPABASE_URL: env.VITE_SUPABASE_URL }, fetchFn)).resolves.toEqual({
      scanned: 0,
      sent: 0,
      failed: 0,
    })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('sends a pending alert and marks it as sent', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: 'notification-1', user_id: 'user-1', title: 'Nueva casa', message: '<segura>', email_attempts: 1,
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'user-1', email: 'qa@example.com' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(dispatchPendingAlertEmails(env, fetchFn)).resolves.toEqual({ scanned: 1, sent: 1, failed: 0 })
    const resendRequest = fetchFn.mock.calls[2]
    expect(resendRequest[0]).toBe('https://api.resend.com/emails')
    expect(resendRequest[1]?.headers).toMatchObject({
      'Idempotency-Key': 'cubitat-alert/notification-1',
    })
    expect(String(resendRequest[1]?.body)).toContain('&lt;segura&gt;')
    expect(String(fetchFn.mock.calls[3][1]?.body)).toContain('"email_delivery_status":"sent"')
  })

  it('uses the DEV provider, sender and public URL when configured', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: 'notification-dev', user_id: 'user-dev', title: 'Nueva casa', message: 'Disponible', email_attempts: 1,
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'user-dev', email: 'qa@example.com' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await dispatchPendingAlertEmails({
      ...env,
      ALERT_EMAIL_PROVIDER_URL: 'http://127.0.0.1:8788/emails',
      ALERT_EMAIL_FROM: 'Cubitat DEV <onboarding@resend.dev>',
      PUBLIC_SITE_URL: 'http://localhost:5173',
    }, fetchFn)

    expect(fetchFn.mock.calls[2][0]).toBe('http://127.0.0.1:8788/emails')
    const providerBody = String(fetchFn.mock.calls[2][1]?.body)
    expect(providerBody).toContain('"from":"Cubitat DEV <onboarding@resend.dev>"')
    expect(providerBody).toContain('http://localhost:5173/resultados')
  })

  it('returns an empty summary when Supabase is unavailable instead of rejecting the cron', async () => {
    const fetchFn = vi.fn().mockRejectedValueOnce(new Error('network unavailable'))

    await expect(dispatchPendingAlertEmails(env, fetchFn)).resolves.toEqual({
      scanned: 0,
      sent: 0,
      failed: 0,
    })
  })

  it('records a terminal failure on the third attempt without returning sensitive data', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: 'notification-1', user_id: 'user-1', title: 'Alerta', message: 'Mensaje', email_attempts: 3,
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'user-1', email: 'private@example.com' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('provider secret body', { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    const result = await dispatchPendingAlertEmails(env, fetchFn)
    expect(result).toEqual({ scanned: 1, sent: 0, failed: 1 })
    expect(JSON.stringify(result)).not.toContain('private@example.com')
    expect(JSON.stringify(result)).not.toContain('provider secret body')
    expect(String(fetchFn.mock.calls[3][1]?.body)).toContain('"email_delivery_status":"failed"')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const dispatchPendingAlertEmails = vi.fn().mockResolvedValue({ scanned: 0, sent: 0, failed: 0 })
const dispatchPendingPushNotifications = vi.fn().mockResolvedValue({ scanned: 0, sent: 0, failed: 0 })
const purgeApprovedKycEvidence = vi.fn().mockResolvedValue({ scanned: 0, deleted: 0, failed: 0 })

vi.mock('./worker/alert-email-dispatcher', () => ({ dispatchPendingAlertEmails }))
vi.mock('./worker/push-notifications', async () => {
  const actual = await vi.importActual<typeof import('./worker/push-notifications')>('./worker/push-notifications')
  return { ...actual, dispatchPendingPushNotifications }
})
vi.mock('./worker/kyc-evidence-retention', () => ({ purgeApprovedKycEvidence }))

describe('Phase 2 DEV scheduled tasks', () => {
  beforeEach(() => {
    dispatchPendingAlertEmails.mockClear()
    dispatchPendingPushNotifications.mockClear()
    purgeApprovedKycEvidence.mockClear()
  })

  it('dispatches push notifications alongside the other Phase 2 jobs', async () => {
    const { runPhase2ScheduledTasks } = await import('./worker-phase2-dev')
    const waitUntil = vi.fn()

    runPhase2ScheduledTasks({} as never, { waitUntil })
    await waitUntil.mock.calls[0]?.[0]

    expect(dispatchPendingAlertEmails).toHaveBeenCalledOnce()
    expect(dispatchPendingPushNotifications).toHaveBeenCalledOnce()
    expect(purgeApprovedKycEvidence).toHaveBeenCalledOnce()
  })
})

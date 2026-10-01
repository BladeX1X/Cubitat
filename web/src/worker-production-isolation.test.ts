import { describe, expect, it } from 'vitest'
import productionWorkerSource from './worker-phase2-production.ts?raw'
import productionWranglerConfig from '../wrangler.jsonc?raw'
import phaseTwoDevWorkerSource from './worker-phase2-dev.ts?raw'
import phaseTwoDevWranglerConfig from '../wrangler.phase2-dev.jsonc?raw'

describe('production Worker Phase 2 isolation', () => {
  it('keeps unpromoted Phase 2 jobs out of the production entrypoint', () => {
    expect(productionWorkerSource).not.toContain('alert-email-dispatcher')
    expect(productionWorkerSource).not.toContain('kyc-evidence-retention')
    expect(productionWorkerSource).toContain('get_public_agent_profile')
    expect(productionWorkerSource).toContain('get_verified_agent_ids')
    expect(productionWorkerSource).toContain('handleContactMetric')
    expect(productionWorkerSource).toContain('submit_kyc_request')
    expect(productionWorkerSource).toContain('review_kyc_request')
  })

  it('keeps PHASE2_ENABLED out while allowing the production Web Push Cron', () => {
    expect(productionWranglerConfig).not.toContain('PHASE2_ENABLED')
    expect(productionWranglerConfig).toContain('"crons"')
    expect(productionWranglerConfig).not.toContain('cubitat1-phase2-dev')
  })

  it('keeps the remaining experimental jobs in the dedicated DEV entrypoint', () => {
    expect(phaseTwoDevWorkerSource).toContain('get_public_agent_profile')
    expect(phaseTwoDevWorkerSource).toContain('submit_kyc_request')
    expect(phaseTwoDevWorkerSource).toContain('dispatchPendingAlertEmails')
    expect(phaseTwoDevWorkerSource).toContain('dispatchPendingPushNotifications')
    expect(phaseTwoDevWranglerConfig).toContain('src/worker-phase2-dev.ts')
    expect(phaseTwoDevWranglerConfig).toContain('"crons"')
    expect(phaseTwoDevWranglerConfig).toContain('"*/1 * * * *"')
  })
})

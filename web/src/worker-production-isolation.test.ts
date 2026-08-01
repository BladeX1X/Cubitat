import { describe, expect, it } from 'vitest'
import productionWorkerSource from './worker.ts?raw'
import productionWranglerConfig from '../wrangler.jsonc?raw'
import phaseTwoDevWorkerSource from './worker-phase2-dev.ts?raw'
import phaseTwoDevWranglerConfig from '../wrangler.phase2-dev.jsonc?raw'

describe('production Worker Phase 2 isolation', () => {
  it('keeps Phase 2 jobs and RPC names out of the production entrypoint', () => {
    expect(productionWorkerSource).not.toContain('alert-email-dispatcher')
    expect(productionWorkerSource).not.toContain('kyc-evidence-retention')
    expect(productionWorkerSource).not.toContain('get_public_agent_profile')
    expect(productionWorkerSource).not.toContain('get_verified_agent_ids')
    expect(productionWorkerSource).not.toContain('increment_contact_clicks')
    expect(productionWorkerSource).not.toContain('submit_kyc_request')
    expect(productionWorkerSource).not.toContain('review_kyc_request')
  })

  it('keeps Cron and PHASE2_ENABLED out of the production Wrangler config', () => {
    expect(productionWranglerConfig).not.toContain('PHASE2_ENABLED')
    expect(productionWranglerConfig).not.toContain('"crons"')
    expect(productionWranglerConfig).not.toContain('cubitat1-phase2-dev')
  })

  it('keeps Phase 2 RPCs and scheduled jobs in the dedicated DEV entrypoint', () => {
    expect(phaseTwoDevWorkerSource).toContain('get_public_agent_profile')
    expect(phaseTwoDevWorkerSource).toContain('submit_kyc_request')
    expect(phaseTwoDevWorkerSource).toContain('dispatchPendingAlertEmails')
    expect(phaseTwoDevWranglerConfig).toContain('src/worker-phase2-dev.ts')
    expect(phaseTwoDevWranglerConfig).toContain('"crons"')
  })
})

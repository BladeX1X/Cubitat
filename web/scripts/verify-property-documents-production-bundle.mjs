import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const assetsPath = fileURLToPath(new URL('../dist/assets/', import.meta.url))
const distPath = fileURLToPath(new URL('../dist/', import.meta.url))
const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url), 'utf8'))
const assetNames = await readdir(assetsPath)
const javascriptAssets = assetNames.filter((name) => name.endsWith('.js'))
const sources = await Promise.all(javascriptAssets.map((name) => readFile(join(assetsPath, name), 'utf8')))

const requiredMarkers = [
  'submit_property_verification',
  'review_property_verification',
  'get_property_trust_score',
  'property_verification_requests',
  'PropertyVerificationModerationTab',
  'PropertyVerificationPanel',
  'tohjzoncoosvjbjcakdl.supabase.co',
]
const forbiddenMarkers = [
  'bknwerqbbysveehcdmzr.supabase.co',
  'cubitat1-phase2-dev',
  'KycModerationTab',
  'kyc_documents',
  'submit_kyc_request',
  'review_kyc_request',
  'AgentDashboardPage-',
  'AgentProfilePage-',
  'get_public_agent_profile',
  'get_verified_agent_ids',
  'claim_pending_push_deliveries',
  'dispatchPendingAlertEmails',
  'get_admin_property_image_hash_status',
  'property_image_hashes',
]

const missingMarkers = requiredMarkers.filter((marker) => !sources.some((source) => source.includes(marker)))
const leakedMarkers = forbiddenMarkers.filter((marker) => sources.some((source) => source.includes(marker)))
if (missingMarkers.length > 0 || leakedMarkers.length > 0) {
  throw new Error([
    ...missingMarkers.map((marker) => `falta el módulo documental productivo: ${marker}`),
    ...leakedMarkers.map((marker) => `se incluyó un módulo fuera del perfil documental: ${marker}`),
  ].join('\n'))
}

const relatedApp = manifest.related_applications?.find((app) => app.platform === 'webapp')
if (relatedApp?.url !== 'https://cubitathome.com/manifest.webmanifest' || relatedApp?.id !== 'https://cubitathome.com/') {
  throw new Error('El manifest documental no apunta a la PWA productiva')
}

const html = await readFile(join(distPath, 'index.html'), 'utf8')
if (html.includes('cubitat1-phase2-dev') || html.includes('bknwerqbbysveehcdmzr.supabase.co')) {
  throw new Error('El build documental productivo expone el origen DEV')
}

console.log('Verified: production bundle includes property documents only and targets production Supabase')

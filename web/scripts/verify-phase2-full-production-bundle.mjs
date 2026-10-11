import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const distPath = fileURLToPath(new URL('../dist/', import.meta.url))
const assetsPath = join(distPath, 'assets')
const manifest = JSON.parse(await readFile(join(distPath, 'manifest.webmanifest'), 'utf8'))
const javascriptAssets = (await readdir(assetsPath)).filter((name) => name.endsWith('.js'))
const sources = await Promise.all(javascriptAssets.map((name) => readFile(join(assetsPath, name), 'utf8')))

const requiredMarkers = [
  'submit_kyc_request',
  'review_kyc_request',
  'KycModerationTab',
  'submit_property_verification',
  'review_property_verification',
  'get_property_trust_score',
  'PropertyVerificationModerationTab',
  'get_verified_seller_ids',
  'property_image_duplicate_flags',
  'get_admin_property_image_hash_status',
  'get_admin_property_image_duplicate_candidates',
  'https://tohjzoncoosvjbjcakdl.supabase.co',
]
const forbiddenMarkers = [
  'https://bknwerqbbysveehcdmzr.supabase.co',
  'cubitat1-phase2-dev',
  'dispatchPendingAlertEmails',
]

const missingMarkers = requiredMarkers.filter((marker) => !sources.some((source) => source.includes(marker)))
const leakedMarkers = forbiddenMarkers.filter((marker) => sources.some((source) => source.includes(marker)))
if (missingMarkers.length > 0 || leakedMarkers.length > 0) {
  throw new Error([
    ...missingMarkers.map((marker) => `falta capacidad de Fase 2 productiva: ${marker}`),
    ...leakedMarkers.map((marker) => `referencia excluida del bundle productivo: ${marker}`),
  ].join('\n'))
}

const relatedApp = manifest.related_applications?.find((app) => app.platform === 'webapp')
if (relatedApp?.url !== 'https://cubitathome.com/manifest.webmanifest' || relatedApp?.id !== 'https://cubitathome.com/') {
  throw new Error('El manifest de Fase 2 productiva no apunta a la PWA productiva')
}

const html = await readFile(join(distPath, 'index.html'), 'utf8')
if (html.includes('cubitat1-phase2-dev') || html.includes('bknwerqbbysveehcdmzr.supabase.co')) {
  throw new Error('El HTML productivo expone el origen de DEV')
}

console.log('Verified: full Phase 2 production bundle includes KYC, property documents, verified seller badge and pHash while excluding DEV and email alerts')

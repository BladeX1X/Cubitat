import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const assetsDirectory = new URL('../dist/assets/', import.meta.url)
const assetsPath = fileURLToPath(assetsDirectory)
const distPath = fileURLToPath(new URL('../dist/', import.meta.url))
const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url), 'utf8'))
const assetNames = await readdir(assetsPath)
const javascriptAssets = assetNames.filter((name) => name.endsWith('.js'))
const sources = await Promise.all(javascriptAssets.map((name) => readFile(join(assetsPath, name), 'utf8')))

const requiredMarkers = ['submit_kyc_request', 'kyc_documents', 'KycModerationTab']
const forbiddenMarkers = [
  'AgentDashboardPage-',
  'AgentProfilePage-',
  'PropertyVerificationModerationTab-',
  'property_verification_requests',
  'get_public_agent_profile',
  'get_verified_agent_ids',
  'increment_contact_clicks',
]

const missingMarkers = requiredMarkers.filter((marker) => !sources.some((source) => source.includes(marker)))
const leakedMarkers = forbiddenMarkers.filter((marker) => sources.some((source) => source.includes(marker)))
if (missingMarkers.length > 0 || leakedMarkers.length > 0) {
  throw new Error([
    ...missingMarkers.map((marker) => `falta KYC: ${marker}`),
    ...leakedMarkers.map((marker) => `se filtro un modulo no autorizado: ${marker}`),
  ].join('\n'))
}

const relatedApp = manifest.related_applications?.find((app) => app.platform === 'webapp')
if (relatedApp?.url !== 'https://cubitathome.com/manifest.webmanifest' || relatedApp?.id !== 'https://cubitathome.com/') {
  throw new Error('El manifest KYC productivo no apunta a la PWA productiva')
}

const html = await readFile(join(distPath, 'index.html'), 'utf8')
if (html.includes('cubitat1-phase2-dev')) {
  throw new Error('El build KYC productivo expone el origen DEV')
}

console.log('Verified: production bundle includes only the isolated KYC module')

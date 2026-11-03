import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const assetsDirectory = new URL('../dist/assets/', import.meta.url)
const assetsPath = fileURLToPath(assetsDirectory)
const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url), 'utf8'))
const assetNames = await readdir(assetsDirectory)
const javascriptAssets = assetNames.filter((name) => name.endsWith('.js'))

const forbiddenAssetNames = [
  /^AgentDashboardPage-.*\.js$/,
  /^AgentProfilePage-.*\.js$/,
  /^AccountPhaseTwoSections-.*\.js$/,
  /^KycModerationTab-.*\.js$/,
  /^PropertyVerificationModerationTab-.*\.js$/,
  /^AgentApplicationsModerationTab-.*\.js$/,
  /^AgentApplicationPage-.*\.js$/,
]

const leakedAssetNames = javascriptAssets.filter((name) =>
  forbiddenAssetNames.some((pattern) => pattern.test(name)),
)

const forbiddenContentMarkers = [
  'submit_kyc_request',
  'review_kyc_request',
  'kyc_documents',
  'get_verified_agent_ids',
  'get_public_agent_profile',
  'get_property_trust_score',
  'property_verification_requests',
  'increment_contact_clicks',
  'agent_application_documents',
  'submit_agent_application_trusted',
  'agent_applications',
  '/api/phase3/agent-applications',
]

const leakedContent = []
for (const assetName of javascriptAssets) {
  const source = await readFile(join(assetsPath, assetName), 'utf8')
  for (const marker of forbiddenContentMarkers) {
    if (source.includes(marker)) {
      leakedContent.push(`${assetName}: ${marker}`)
    }
  }
}

if (leakedAssetNames.length > 0 || leakedContent.length > 0) {
  const details = [
    ...leakedAssetNames.map((name) => `asset exclusivo: ${name}`),
    ...leakedContent.map((entry) => `contenido exclusivo: ${entry}`),
  ]
  throw new Error(
    `El build base de producción incluye módulos exclusivos de Fase 2/3:\n- ${details.join('\n- ')}`,
  )
}

const relatedApp = manifest.related_applications?.find((app) => app.platform === 'webapp')
if (relatedApp?.url !== 'https://cubitathome.com/manifest.webmanifest' || relatedApp?.id !== 'https://cubitathome.com/') {
  throw new Error('El manifest productivo no apunta a la PWA productiva')
}

console.log('Verified: base production bundle excludes exclusive Phase 2/3 modules')

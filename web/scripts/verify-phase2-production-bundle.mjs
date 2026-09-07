import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const assetsDirectory = new URL('../dist/assets/', import.meta.url)
const assetsPath = fileURLToPath(assetsDirectory)
const assetNames = await readdir(assetsDirectory)
const javascriptAssets = assetNames.filter((name) => name.endsWith('.js'))

const forbiddenAssetNames = [
  /^AgentDashboardPage-.*\.js$/,
  /^AgentProfilePage-.*\.js$/,
  /^KycModerationTab-.*\.js$/,
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
  'increment_contact_clicks',
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
    `El build productivo incluye módulos exclusivos de Fase 2:\n- ${details.join('\n- ')}`,
  )
}

console.log('Verified: production bundle excludes exclusive Phase 2 modules')

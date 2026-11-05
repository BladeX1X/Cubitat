import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const assetsDirectory = resolve('dist/assets')
const assetNames = await readdir(assetsDirectory)
const requiredModules = ['ServiceDirectoryPage', 'MyServiceProfilesPage', 'ServiceProviderSubmissionPage', 'ServiceProviderModerationTab', 'ServiceReviewsPanel', 'ServiceReviewModerationTab', 'MaterialsMarketplacePage', 'MaterialListingSubmissionPage', 'MyMaterialListingsPage', 'MaterialModerationTab']
const missingModule = requiredModules.find((marker) => !assetNames.some((name) => name.includes(marker)))
if (missingModule) {
  console.error(`Phase 4 DEV bundle is missing an enabled F4-SVC/F4-REV/F4-MAT module chunk: ${missingModule}`)
  process.exit(1)
}

const forbiddenModules = ['BusinessEntitlementsAdminTab', 'ValuationRequestPage']
const includedForbiddenModule = forbiddenModules.find((marker) => assetNames.some((name) => name.includes(marker)))
if (includedForbiddenModule) {
  console.error(`Phase 4 DEV bundle unexpectedly includes another module: ${includedForbiddenModule}`)
  process.exit(1)
}

const publicFiles = await Promise.all(['manifest.webmanifest', 'sitemap.xml', 'robots.txt']
  .map((name) => readFile(resolve('dist', name), 'utf8')))
const publicArtifacts = publicFiles.join('\n')
if (!publicArtifacts.includes('cubitat1-phase2-dev.pochiprats18.workers.dev')) {
  console.error('Phase 4 DEV public artifacts do not use the isolated DEV origin.')
  process.exit(1)
}
const javascript = await Promise.all(assetNames.filter((name) => name.endsWith('.js'))
  .map((name) => readFile(resolve(assetsDirectory, name), 'utf8')))
const productionReference = javascript.some((source) => source.includes('tohjzoncoosvjbjcakdl.supabase.co'))
if (publicArtifacts.includes('cubitathome.com') || productionReference) {
  console.error('Phase 4 DEV bundle contains production origin markers.')
  process.exit(1)
}

console.log('Verified: DEV bundle contains only the F4-SVC, F4-REV and F4-MAT UIs among Phase 4 modules.')

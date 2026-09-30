import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const assetsDirectory = new URL('../dist/assets/', import.meta.url)
const assetsPath = fileURLToPath(assetsDirectory)
const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url))
const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url), 'utf8'))
const assetNames = await readdir(assetsPath)
const javascriptAssets = assetNames.filter((name) => name.endsWith('.js'))

const requiredMarkers = [
  'submit_kyc_request',
  'kyc_documents',
]

const sources = await Promise.all(
  javascriptAssets.map(async (assetName) => readFile(join(assetsPath, assetName), 'utf8')),
)

const publicHtml = await readFile(join(distDirectory, 'index.html'), 'utf8')
const sitemap = await readFile(join(distDirectory, 'sitemap.xml'), 'utf8')
const robots = await readFile(join(distDirectory, 'robots.txt'), 'utf8')
const forbiddenProductionReferences = [
  'https://tohjzoncoosvjbjcakdl.supabase.co',
]
const leakedProductionReferences = forbiddenProductionReferences.filter((reference) =>
  publicHtml.includes(reference) || sources.some((source) => source.includes(reference)),
)

if (leakedProductionReferences.length > 0) {
  throw new Error(
    `El bundle DEV expone referencias productivas: ${leakedProductionReferences.join(', ')}`,
  )
}

const expectedDevOrigin = 'https://cubitat1-phase2-dev.pochiprats18.workers.dev'
if (!sitemap.includes(`<loc>${expectedDevOrigin}/</loc>`) || !robots.includes(`Sitemap: ${expectedDevOrigin}/sitemap.xml`)) {
  throw new Error('El sitemap o robots DEV no apunta al origen del Worker DEV')
}

if (sitemap.includes('https://cubitathome.com') || robots.includes('https://cubitathome.com')) {
  throw new Error('Los artefactos SEO DEV exponen el origen productivo')
}

const missingMarkers = requiredMarkers.filter((marker) =>
  !sources.some((source) => source.includes(marker)),
)

if (missingMarkers.length > 0) {
  throw new Error(
    `El bundle remoto de Fase 2 no incluye KYC: ${missingMarkers.join(', ')}`,
  )
}

const relatedApp = manifest.related_applications?.find((app) => app.platform === 'webapp')
if (relatedApp?.url !== `${expectedDevOrigin}/manifest.webmanifest` || relatedApp?.id !== `${expectedDevOrigin}/`) {
  throw new Error('El manifest DEV no apunta a la PWA instalada del Worker DEV')
}

console.log('Verified: Phase 2 DEV bundle includes the KYC module')

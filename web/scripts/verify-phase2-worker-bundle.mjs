import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const webDirectory = fileURLToPath(new URL('../', import.meta.url))
const wranglerCli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
const outputDirectory = await mkdtemp(join(tmpdir(), 'cubitat-worker-production-'))

const requiredMarkers = [
  'submit_kyc_request',
  'review_kyc_request',
  'submit_property_verification',
  'review_property_verification',
  'get_property_trust_score',
  'get_public_agent_profile',
  'get_verified_agent_ids',
  'get_verified_seller_ids',
  'claim_kyc_evidence_for_purge',
  'property-image-duplicates',
  'get_admin_property_image_hash_status',
  'get_admin_property_image_duplicate_candidates',
  'contact-click',
]
const propertyVerificationRpcs = [
  'submit_property_verification',
  'review_property_verification',
  'get_property_trust_score',
]
const imageDuplicateRpcs = [
  'get_admin_property_image_hash_status',
  'get_admin_property_image_duplicate_candidates',
]
const forbiddenMarkers = [
  'dispatchPendingAlertEmails',
  'cubitat1-phase2-dev',
  'phase2-dev',
]

try {
  const productionWorkerSource = await readFile(join(webDirectory, 'src/worker-phase2-production.ts'), 'utf8')
  const authenticatedRpcBlock = productionWorkerSource.match(/additionalAuthenticatedRpcs:\s*\[([\s\S]*?)\]/)?.[1] ?? ''
  const publicRpcBlock = productionWorkerSource.match(/additionalPublicRpcs:\s*\[([\s\S]*?)\]/)?.[1] ?? ''
  const missingAuthenticatedRpcs = propertyVerificationRpcs.filter((rpc) => !authenticatedRpcBlock.includes(`'${rpc}'`))
  const publiclyExposedRpcs = propertyVerificationRpcs.filter((rpc) => publicRpcBlock.includes(`'${rpc}'`))
  const missingImageDuplicateRpcs = imageDuplicateRpcs.filter((rpc) => !authenticatedRpcBlock.includes(`'${rpc}'`))
  const publiclyExposedImageDuplicateRpcs = imageDuplicateRpcs.filter((rpc) => publicRpcBlock.includes(`'${rpc}'`))
  const missingPublicSellerBadgeRpc = !publicRpcBlock.includes("'get_verified_seller_ids'")
  if (missingAuthenticatedRpcs.length > 0 || publiclyExposedRpcs.length > 0 || missingImageDuplicateRpcs.length > 0 || publiclyExposedImageDuplicateRpcs.length > 0 || missingPublicSellerBadgeRpc) {
    throw new Error([
      ...missingAuthenticatedRpcs.map((rpc) => `RPC documental fuera de allowlist autenticada: ${rpc}`),
      ...publiclyExposedRpcs.map((rpc) => `RPC documental expuesta en allowlist pública: ${rpc}`),
      ...missingImageDuplicateRpcs.map((rpc) => `RPC pHash fuera de allowlist autenticada: ${rpc}`),
      ...publiclyExposedImageDuplicateRpcs.map((rpc) => `RPC pHash expuesta en allowlist pública: ${rpc}`),
      ...(missingPublicSellerBadgeRpc ? ['RPC de insignia de vendedor verificado fuera de allowlist pública'] : []),
    ].join('\n'))
  }

  const result = spawnSync(
    process.execPath,
    [wranglerCli, 'deploy', '--dry-run', '--config', 'wrangler.jsonc', '--outdir', outputDirectory],
    { cwd: webDirectory, encoding: 'utf8' },
  )

  if (result.status !== 0) {
    throw new Error(`No se pudo compilar el Worker productivo:\n${result.stderr || result.stdout}`)
  }

  const bundleName = (await readdir(outputDirectory)).find((name) => name.endsWith('.js'))
  if (!bundleName) throw new Error('Wrangler no generó el bundle JavaScript esperado.')

  const source = await readFile(join(outputDirectory, bundleName), 'utf8')
  const missingMarkers = requiredMarkers.filter((marker) => !source.includes(marker))
  if (missingMarkers.length > 0) {
    throw new Error(`Faltan módulos Fase 2 autorizados en Worker productivo: ${missingMarkers.join(', ')}`)
  }

  const leakedMarkers = forbiddenMarkers.filter((marker) => source.includes(marker))
  if (leakedMarkers.length > 0) {
    throw new Error(`El Worker productivo incluye módulos diferidos o exclusivos de DEV: ${leakedMarkers.join(', ')}`)
  }

  console.log('Verified: production Worker bundle contains required KYC modules and excludes deferred email/DEV modules')
} finally {
  await rm(outputDirectory, { recursive: true, force: true })
}

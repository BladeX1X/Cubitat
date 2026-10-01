import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const webDirectory = fileURLToPath(new URL('../', import.meta.url))
const wranglerCli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
const outputDirectory = await mkdtemp(join(tmpdir(), 'cubitat-worker-production-'))

const forbiddenMarkers = []

try {
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
  const leakedMarkers = forbiddenMarkers.filter((marker) => source.includes(marker))
  if (leakedMarkers.length > 0) {
    throw new Error(`El Worker productivo incluye Fase 2: ${leakedMarkers.join(', ')}`)
  }

  console.log('Verified: production Worker bundle contains only explicitly promoted Phase 2 modules')
} finally {
  await rm(outputDirectory, { recursive: true, force: true })
}

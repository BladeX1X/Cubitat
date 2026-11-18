import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// GitHub withdrew this advisory on 2026-11-18; npm's audit feed still reports it.
// Remove this exception as soon as the npm audit feed stops returning the advisory.
const withdrawnAdvisories = new Set([
  'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
])

export function isOnlyWithdrawnHighFinding(report) {
  const highAdvisories = new Map()
  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const advisory of vulnerability.via ?? []) {
      if (typeof advisory !== 'object' || !['high', 'critical'].includes(advisory.severity)) continue
      highAdvisories.set(advisory.url, advisory)
    }
  }

  const totals = report.metadata?.vulnerabilities
  const hasBlockingSeverity = (totals?.high ?? 0) > 0 || (totals?.critical ?? 0) > 0
  return hasBlockingSeverity
    && highAdvisories.size === 1
    && [...highAdvisories.keys()].every((url) => withdrawnAdvisories.has(url))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npm, ['audit', '--audit-level=high', '--json', '--registry=https://registry.npmjs.org'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    shell: process.platform === 'win32',
  })

  if (result.error || result.status === null) {
    console.error('No se pudo ejecutar npm audit:', result.error?.message ?? result.stderr)
    process.exit(1)
  }

  let report
  try {
    report = JSON.parse(result.stdout)
  } catch {
    console.error('npm audit no devolvió un informe JSON válido:', result.stderr || result.stdout)
    process.exit(1)
  }

  if (report.error) {
    console.error('npm audit falló:', report.error.summary ?? report.error.message)
    process.exit(1)
  }

  if (result.status === 0) {
    console.log('Auditoría de dependencias sin avisos altos.')
    process.exit(0)
  }

  if (isOnlyWithdrawnHighFinding(report)) {
    console.warn('npm aún reporta GHSA-fc5q-39xc-vjpf, retirado por GitHub el 2026-11-18; se permite únicamente este aviso. Los demás avisos altos siguen bloqueando CI.')
    process.exit(0)
  }

  console.error('La auditoría detectó avisos altos o un error no cubierto por la excepción retirada.')
  console.error(result.stdout)
  process.exit(1)
}

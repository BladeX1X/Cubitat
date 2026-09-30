import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const distPath = fileURLToPath(new URL('../dist/', import.meta.url))
const forbiddenMarkers = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'GROQ_API_KEY',
  'VAPID_PRIVATE_KEY',
  'RESEND_API_KEY',
  'server-only-service-role-key',
]

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath))
    } else if (entry.isFile()) {
      files.push(entryPath)
    }
  }
  return files
}

const files = await collectFiles(distPath)
const leaks = []
for (const filePath of files) {
  const source = await readFile(filePath, 'utf8')
  for (const marker of forbiddenMarkers) {
    if (source.includes(marker)) {
      leaks.push(`${filePath.replace(`${distPath}`, 'dist/')}: ${marker}`)
    }
  }
}

if (leaks.length > 0) {
  throw new Error(`El bundle contiene referencias a secretos privados:\n- ${leaks.join('\n- ')}`)
}

console.log('Verified: compiled bundles contain no private secret markers')

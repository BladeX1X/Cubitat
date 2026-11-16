import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const configPath = fileURLToPath(new URL('../wrangler.phase34-dev.jsonc', import.meta.url))
const config = await readFile(configPath, 'utf8')
const expected = [
  '"name": "cubitat1-phase2-dev"',
  '"PHASE2_ENABLED": "true"',
  '"PHASE3_ENABLED": "true"',
  '"VITE_SUPABASE_URL": "https://bknwerqbbysveehcdmzr.supabase.co"',
  '"PUBLIC_SITE_URL": "https://cubitat1-phase2-dev.pochiprats18.workers.dev"',
]
const missing = expected.filter((entry) => !config.includes(entry))
if (missing.length) throw new Error(`Configuración combinada DEV incompleta: ${missing.join('; ')}`)
if (config.includes('tohjzoncoosvjbjcakdl') || config.includes('cubitathome.com/*')) {
  throw new Error('El perfil phase34-dev contiene configuración de producción.')
}

console.log('Verified: Worker Phase 3+4 uses DEV project, DEV origin, and keeps production out of scope.')

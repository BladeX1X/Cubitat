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
  '"previews": {',
  '"durable_objects": {',
  '"class_name": "RateLimiter"',
]
const missing = expected.filter((entry) => !config.includes(entry))
if (missing.length) throw new Error(`Configuración combinada DEV incompleta: ${missing.join('; ')}`)
if (config.includes('tohjzoncoosvjbjcakdl') || config.includes('cubitathome.com/*')) {
  throw new Error('El perfil phase34-dev contiene configuración de producción.')
}

const parsed = JSON.parse(config)
const previews = parsed.previews
if (previews?.vars?.VITE_SUPABASE_URL !== 'https://bknwerqbbysveehcdmzr.supabase.co'
  || previews?.vars?.PHASE2_ENABLED !== 'true'
  || previews?.vars?.PHASE3_ENABLED !== 'true'
  || !previews?.durable_objects?.bindings?.some((binding) =>
    binding.name === 'RATE_LIMITER' && binding.class_name === 'RateLimiter')) {
  throw new Error('La configuración de Preview no tiene variables y Durable Object aislados de DEV.')
}
if (previews.services?.length) {
  throw new Error('Los previews no deben usar un Service Binding remoto; usar el endpoint DEV explícito.')
}

console.log('Verified: Worker Phase 3+4 previews use DEV project, isolated Durable Object, and keep production out of scope.')

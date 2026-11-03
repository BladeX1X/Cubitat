import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const distPath = fileURLToPath(new URL('../dist/', import.meta.url))
const assetsPath = join(distPath, 'assets')
const sources = await Promise.all((await readdir(assetsPath))
  .filter((name) => name.endsWith('.js'))
  .map((name) => readFile(join(assetsPath, name), 'utf8')))

const requiredMarkers = [
  'Postúlate como agente',
  'Postulaciones de agentes',
  'Crear mi enlace',
  'ensure_agent_referral_link',
  '/api/phase3/agent-applications',
  'https://tohjzoncoosvjbjcakdl.supabase.co',
]
const forbiddenMarkers = [
  'https://bknwerqbbysveehcdmzr.supabase.co',
  'cubitat1-phase2-dev',
]
const missing = requiredMarkers.filter((marker) => !sources.some((source) => source.includes(marker)))
const leaked = forbiddenMarkers.filter((marker) => sources.some((source) => source.includes(marker)))

if (missing.length || leaked.length) {
  throw new Error([
    ...missing.map((marker) => `falta capacidad de Fase 3 en bundle productivo: ${marker}`),
    ...leaked.map((marker) => `referencia DEV en bundle productivo: ${marker}`),
  ].join('\n'))
}

console.log('Verified: Phase 3 application, moderation and referral UI is in the production profile and contains no DEV origin')

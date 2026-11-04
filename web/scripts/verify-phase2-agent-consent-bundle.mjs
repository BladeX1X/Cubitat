import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const assetsPath = fileURLToPath(new URL('../dist/assets/', import.meta.url))
const sources = await Promise.all((await readdir(assetsPath))
  .filter((name) => name.endsWith('.js'))
  .map((name) => readFile(join(assetsPath, name), 'utf8')))

const required = [
  'Mostrar mi WhatsApp en mi perfil público',
  'public_whatsapp_enabled',
]
const forbidden = [
  '/api/phase3/agent-applications',
  'Postúlate como agente',
  'AgentApplicationsModerationTab',
  'Crear mi enlace',
]
const missing = required.filter((marker) => !sources.some((source) => source.includes(marker)))
const leaked = forbidden.filter((marker) => sources.some((source) => source.includes(marker)))

if (missing.length || leaked.length) {
  throw new Error([
    ...missing.map((marker) => `falta consentimiento WhatsApp de agente: ${marker}`),
    ...leaked.map((marker) => `se incluyó UI/endpoints de Fase 3 fuera del alcance: ${marker}`),
  ].join('\n'))
}

console.log('Verified: production bundle contains agent WhatsApp consent and excludes other Phase 3 UI')

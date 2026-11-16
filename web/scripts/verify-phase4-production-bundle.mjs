import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const distPath = fileURLToPath(new URL('../dist/', import.meta.url))
const assetsPath = join(distPath, 'assets')
const javascriptAssets = (await readdir(assetsPath)).filter((name) => name.endsWith('.js'))
const sources = await Promise.all(javascriptAssets.map((name) => readFile(join(assetsPath, name), 'utf8')))

const requiredMarkers = [
  'Servicios para el hogar',
  'Profesionales disponibles',
  'Comparte tu experiencia',
  'Materiales disponibles',
  'Beneficios comerciales',
  'marketplace-contact',
  'https://tohjzoncoosvjbjcakdl.supabase.co',
]
const forbiddenMarkers = [
  'https://bknwerqbbysveehcdmzr.supabase.co',
  'cubitat1-phase2-dev',
  'get_property_value_comparables',
]
const missing = requiredMarkers.filter((marker) => !sources.some((source) => source.includes(marker)))
const leaked = forbiddenMarkers.filter((marker) => sources.some((source) => source.includes(marker)))
const html = await readFile(join(distPath, 'index.html'), 'utf8')
if (html.includes('cubitat1-phase2-dev') || html.includes('bknwerqbbysveehcdmzr.supabase.co')) {
  leaked.push('DEV origin in index.html')
}

if (missing.length || leaked.length) {
  throw new Error([
    ...missing.map((marker) => `falta capacidad F4 en el bundle productivo: ${marker}`),
    ...leaked.map((marker) => `referencia DEV en bundle productivo: ${marker}`),
  ].join('\n'))
}

console.log('Verified: Fase 4 production UI and private contact are present; valuation and DEV origins are absent')

import { readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const assets = resolve('dist/assets')
const files = (await readdir(assets)).filter((name) => name.endsWith('.js'))
const sources = await Promise.all(files.map((name) => readFile(join(assets, name), 'utf8')))
const required = [
  '¿Quieres ser agente de Cubitat?',
  'Postúlate como agente',
  'Postulaciones de agentes',
  '/api/phase3/agent-applications',
]
const missing = required.filter((marker) => !sources.some((source) => source.includes(marker)))
if (missing.length) throw new Error(`Bundle phase34-dev omite capacidades F3: ${missing.join('; ')}`)

const forbidden = ['https://tohjzoncoosvjbjcakdl.supabase.co']
const leaked = forbidden.filter((marker) => sources.some((source) => source.includes(marker)))
if (leaked.length) throw new Error(`Bundle phase34-dev contiene referencias productivas: ${leaked.join('; ')}`)

const publicFiles = await Promise.all(['manifest.webmanifest', 'sitemap.xml', 'robots.txt']
  .map((name) => readFile(resolve('dist', name), 'utf8')))
if (publicFiles.join('\n').includes('https://cubitathome.com')) {
  throw new Error('Artefactos públicos phase34-dev contienen el dominio productivo.')
}

console.log('Verified: F3 application UI is present in the DEV bundle, with no production references.')

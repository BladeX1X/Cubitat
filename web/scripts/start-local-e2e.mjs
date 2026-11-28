import { execFileSync, spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseLocalSupabaseStatus } from './local-e2e-config.mjs'

const webRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const supabaseCli = process.env.SUPABASE_CLI_PATH
  || (process.platform === 'win32'
    ? resolve(process.env.LOCALAPPDATA || '', 'Programs/SupabaseCLI/supabase.exe')
    : 'supabase')
let statusOutput
try {
  statusOutput = execFileSync(supabaseCli, ['status', '-o', 'env'], {
    cwd: webRoot,
    encoding: 'utf8',
    windowsHide: true,
  })
} catch {
  throw new Error('Inicia Supabase local con “npx supabase start” antes de correr los E2E.')
}

const localSupabase = parseLocalSupabaseStatus(statusOutput)
const port = process.env.CUBITAT_E2E_PORT || '5174'
if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
  throw new Error('CUBITAT_E2E_PORT debe ser un puerto válido.')
}

const env = {
  ...process.env,
  CUBITAT_E2E_SUPABASE_URL: localSupabase.url,
  CUBITAT_E2E_TURNSTILE_TEST: process.env.CUBITAT_E2E_TURNSTILE_TEST || 'true',
  SUPABASE_CLI_PATH: supabaseCli,
  VITE_SUPABASE_URL: localSupabase.url,
  VITE_SUPABASE_ANON_KEY: localSupabase.anonKey,
  VITE_PHASE4_SVC_ENABLED: 'true',
  VITE_PHASE4_MAT_ENABLED: 'true',
}

const viteCli = resolve(webRoot, 'node_modules/vite/bin/vite.js')
const child = spawn(process.execPath, [
  viteCli,
  '--host', '127.0.0.1',
  '--mode', 'phase2-dev',
  ...process.argv.slice(2),
], { cwd: webRoot, env, stdio: 'inherit', windowsHide: true })

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('error', (error) => {
  console.error(`No se pudo iniciar Vite para E2E: ${error.message}`)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})


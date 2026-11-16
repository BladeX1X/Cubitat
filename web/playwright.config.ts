import { defineConfig, devices } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { assertSafeQaE2ETarget } from './e2e/qaTarget'

const e2ePort = Number(process.env.CUBITAT_E2E_PORT ?? '5174')
if (!Number.isInteger(e2ePort) || e2ePort < 1024 || e2ePort > 65535) {
  throw new Error('CUBITAT_E2E_PORT debe ser un puerto válido entre 1024 y 65535.')
}
const localE2EBaseUrl = `http://127.0.0.1:${e2ePort}`
const e2eBaseUrl = process.env.CUBITAT_E2E_BASE_URL ?? localE2EBaseUrl
const useExternalServer = Boolean(process.env.CUBITAT_E2E_BASE_URL)
const e2eSupabaseUrl = process.env.CUBITAT_E2E_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
assertSafeQaE2ETarget(e2eBaseUrl, e2eSupabaseUrl, process.env.CUBITAT_E2E_ALLOW_CLOUD === 'true')

function readLocalSupabaseAnonKey(): string | undefined {
  try {
    const cli = process.env.SUPABASE_CLI_PATH || 'supabase'
    const output = execFileSync(cli, ['status', '-o', 'env'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    })
    return output.match(/^ANON_KEY="?([^"\r\n]+)"?$/m)?.[1]
  } catch {
    return undefined
  }
}

// The default local profile must use the anon key minted by local Supabase.
// Never reuse a hosted key here: all browser traffic is pinned to loopback.
const localSupabaseAnonKey = useExternalServer ? undefined : readLocalSupabaseAnonKey()

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Keep Chromium below local CPU/network saturation, especially in map and
  // image flows that share the local Vite server and remote tile endpoints.
  workers: process.env.CI ? 1 : 2,
  reporter: 'list',
  use: {
    baseURL: e2eBaseUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(useExternalServer ? {} : {
    webServer: {
      command: `npm run dev -- --mode phase2-dev --port ${e2ePort} --strictPort`,
      url: localE2EBaseUrl,
      reuseExistingServer: process.env.CUBITAT_E2E_REUSE_SERVER === 'true',
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
        ),
        // The default local E2E server must never fall back to a hosted Supabase project.
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        ...(localSupabaseAnonKey ? { VITE_SUPABASE_ANON_KEY: localSupabaseAnonKey } : {}),
        VITE_PHASE3_UI_ENABLED: 'true',
        VITE_PHASE4_SVC_ENABLED: 'true',
        VITE_PHASE4_REV_ENABLED: 'true',
        VITE_PHASE4_MAT_ENABLED: 'true',
        VITE_PHASE4_BIZ_ENABLED: 'true',
        VITE_PHASE4_VAL_ENABLED: 'false',
      },
    },
  }),
})

import { defineConfig, devices } from '@playwright/test'
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

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
      command: `npm run dev -- --port ${e2ePort} --strictPort`,
      url: localE2EBaseUrl,
      reuseExistingServer: process.env.CUBITAT_E2E_REUSE_SERVER === 'true',
    },
  }),
})

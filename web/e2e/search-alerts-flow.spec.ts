import { expect, test } from '@playwright/test'
import { assertLocalMutationTarget } from './qaTarget'

const BASE_URL = process.env.CUBITAT_E2E_BASE_URL ?? 'http://127.0.0.1:5174'
const SUPABASE_URL = process.env.CUBITAT_E2E_SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? 'http://127.0.0.1:54321'
const E2E_EMAIL = process.env.CUBITAT_E2E_EMAIL
const E2E_PASSWORD = process.env.CUBITAT_E2E_PASSWORD
const E2E_SESSION_JSON = process.env.CUBITAT_E2E_SESSION
const ALLOW_MUTATIONS = process.env.CUBITAT_E2E_ALLOW_MUTATIONS === 'true'

type E2ESession = {
  access_token: string
  refresh_token: string
  user: { id: string; [key: string]: unknown }
}

test.describe('search alerts with an isolated QA account', () => {
  test.skip(!E2E_SESSION_JSON && (!E2E_EMAIL || !E2E_PASSWORD), 'Definir una sesión QA temporal o CUBITAT_E2E_EMAIL y CUBITAT_E2E_PASSWORD')
  test.skip(!ALLOW_MUTATIONS, 'Definir CUBITAT_E2E_ALLOW_MUTATIONS=true para autorizar escrituras QA')

  test('creates and removes only the alert created by this test', async ({ page }) => {
    assertLocalMutationTarget(BASE_URL, SUPABASE_URL)
    const uniqueQuery = `qa-alert-${Date.now()}`
    let alertCreated = false

    try {
      await page.goto(`${BASE_URL}/resultados?q=${encodeURIComponent(uniqueQuery)}`)
      await page.locator('.results-floating-alert, .map-bottom-primary').first().click()

      const loginDialog = page.getByRole('dialog', { name: /inicio de sesion/i })
      await expect(loginDialog).toBeVisible()
      if (E2E_SESSION_JSON) {
        const session = JSON.parse(E2E_SESSION_JSON) as E2ESession
        await loginDialog.getByRole('button', { name: 'Cerrar' }).click()
        await page.evaluate((authSession) => {
          const expiresAt = Math.floor(Date.now() / 1000) + 3600
          window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
            access_token: authSession.access_token,
            token_type: 'bearer',
            expires_in: 3600,
            expires_at: expiresAt,
            refresh_token: authSession.refresh_token,
            user: authSession.user,
          }))
        }, session)
        await page.reload()
        await page.waitForLoadState('networkidle')
      } else {
        await loginDialog.getByRole('textbox', { name: /correo electronico/i }).fill(E2E_EMAIL!)
        await loginDialog.getByRole('textbox', { name: /contrasena/i }).fill(E2E_PASSWORD!)
        await loginDialog.getByRole('button', { name: /iniciar sesi[oó]n/i }).click()
      }
      await expect(loginDialog).toBeHidden()

      await expect(page.getByRole('heading', { name: /alerta de b[uú]squeda creada/i })).toBeVisible()
      alertCreated = true

      await page.goto(`${BASE_URL}/mi-cuenta`)
      const createdAlert = page.locator('[data-search-alert-id]').filter({ hasText: uniqueQuery })
      await expect(createdAlert).toHaveCount(1)
    } finally {
      if (alertCreated) {
        await page.goto(`${BASE_URL}/mi-cuenta`)
        const createdAlert = page.locator('[data-search-alert-id]').filter({ hasText: uniqueQuery })
        if (await createdAlert.count() === 1) {
          await createdAlert.getByRole('button', { name: /eliminar/i }).click()
          await expect(createdAlert).toHaveCount(0)
        }
      }
    }
  })
})

import { expect, test } from '@playwright/test'

const BASE_URL = process.env.CUBITAT_E2E_BASE_URL ?? 'http://localhost:5173'
const E2E_EMAIL = process.env.CUBITAT_E2E_EMAIL
const E2E_PASSWORD = process.env.CUBITAT_E2E_PASSWORD
const ALLOW_MUTATIONS = process.env.CUBITAT_E2E_ALLOW_MUTATIONS === 'true'

test.describe('search alerts with an isolated QA account', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'Definir CUBITAT_E2E_EMAIL y CUBITAT_E2E_PASSWORD')
  test.skip(!ALLOW_MUTATIONS, 'Definir CUBITAT_E2E_ALLOW_MUTATIONS=true para autorizar escrituras QA')

  test('creates and removes only the alert created by this test', async ({ page }) => {
    const uniqueQuery = `qa-alert-${Date.now()}`
    let alertCreated = false

    try {
      await page.goto(`${BASE_URL}/resultados?q=${encodeURIComponent(uniqueQuery)}`)
      await page.locator('.results-floating-alert, .map-bottom-primary').first().click()

      await expect(page.getByText('Inicia sesion para guardar esta alerta.')).toBeVisible()
      await page.fill('input[type="email"]', E2E_EMAIL!)
      await page.fill('input[type="password"]', E2E_PASSWORD!)
      await page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click()
      await expect(page.locator('.login-modal-overlay')).toBeHidden()

      await expect(page.getByText('Alerta creada. La veras en Mi cuenta.')).toBeVisible()
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

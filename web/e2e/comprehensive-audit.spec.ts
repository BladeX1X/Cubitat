import { test, expect } from '@playwright/test'

const E2E_EMAIL = process.env.CUBITAT_E2E_EMAIL
const E2E_PASSWORD = process.env.CUBITAT_E2E_PASSWORD
const BASE_URL = process.env.CUBITAT_E2E_BASE_URL ?? 'http://127.0.0.1:5174'

test('Auditoría completa de páginas de Cubitat', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message)
  })

  // 1. Visitar Home Page
  await page.goto(`${BASE_URL}/`)
  await page.waitForTimeout(4000)
  await page.screenshot({ path: testInfo.outputPath('audit_1_home.png') })
  expect(await page.title()).not.toBeNull()

  // 2. Validar el listado público antes del tramo autenticado.
  await page.goto(`${BASE_URL}/resultados`)
  await page.waitForTimeout(5000)
  await page.screenshot({ path: testInfo.outputPath('audit_2_resultados_publicos.png') })
  expect(await page.title()).not.toBeNull()

  if (!E2E_EMAIL || !E2E_PASSWORD) {
    testInfo.annotations.push({
      type: 'note',
      description: 'Tramo autenticado omitido: faltan CUBITAT_E2E_EMAIL y CUBITAT_E2E_PASSWORD.',
    })
    expect(consoleErrors).toEqual([])
    return
  }

  // 3. Abrir e iniciar sesión con credenciales
  await page.click('button:has-text("Ingresar")')
  await page.fill('input[type="email"]', E2E_EMAIL!)
  await page.fill('input[type="password"]', E2E_PASSWORD!)
  await page.click('.login-modal-card button[type="submit"]')
  await page.waitForSelector('button:has-text("Ingresar")', { state: 'detached', timeout: 15000 })
  await page.screenshot({ path: testInfo.outputPath('audit_3_login_ok.png') })

  // 4. Ir a Favoritos
  await page.goto(`${BASE_URL}/favoritos`)
  await page.waitForTimeout(4000)
  await page.screenshot({ path: testInfo.outputPath('audit_4_favoritos.png') })

  // 5. Ir a Mi Cuenta
  await page.goto(`${BASE_URL}/mi-cuenta`)
  await page.waitForTimeout(4000)
  await page.screenshot({ path: testInfo.outputPath('audit_5_cuenta.png') })

  // 6. Ir a Mis Publicaciones
  await page.goto(`${BASE_URL}/mis-propiedades`)
  await page.waitForTimeout(4000)
  await page.screenshot({ path: testInfo.outputPath('audit_6_mis_propiedades.png') })

  if (consoleErrors.length > 0) {
    console.error('Errores de consola:', consoleErrors)
  }
  expect(consoleErrors.length).toBe(0)
})

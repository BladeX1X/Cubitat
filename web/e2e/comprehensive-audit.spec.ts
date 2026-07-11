import { test, expect } from '@playwright/test'

test('Auditoría completa de páginas de Cubitat', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message)
  })

  // 1. Visitar Home Page
  await page.goto('http://localhost:5173/')
  await page.waitForTimeout(4000)
  await page.screenshot({ path: 'C:/Users/Jorba/.gemini/antigravity/brain/ab5b9bdb-a516-4b5d-bc7f-166250ae927f/audit_1_home.png' })
  expect(await page.title()).not.toBeNull()

  // 2. Abrir e iniciar sesión con credenciales
  await page.click('button:has-text("Ingresar")')
  await page.fill('input[type="email"]', 'pochiprats@gmail.com')
  await page.fill('input[type="password"]', '12345678')
  await page.click('.login-modal-card button[type="submit"]')
  await page.waitForSelector('button:has-text("Ingresar")', { state: 'detached', timeout: 15000 })
  await page.screenshot({ path: 'C:/Users/Jorba/.gemini/antigravity/brain/ab5b9bdb-a516-4b5d-bc7f-166250ae927f/audit_2_login_ok.png' })

  // 3. Ir a Resultados
  await page.goto('http://localhost:5173/resultados')
  await page.waitForTimeout(5000)
  await page.screenshot({ path: 'C:/Users/Jorba/.gemini/antigravity/brain/ab5b9bdb-a516-4b5d-bc7f-166250ae927f/audit_3_resultados.png' })

  // 4. Ir a Favoritos
  await page.goto('http://localhost:5173/favoritos')
  await page.waitForTimeout(4000)
  await page.screenshot({ path: 'C:/Users/Jorba/.gemini/antigravity/brain/ab5b9bdb-a516-4b5d-bc7f-166250ae927f/audit_4_favoritos.png' })

  // 5. Ir a Mi Cuenta
  await page.goto('http://localhost:5173/mi-cuenta')
  await page.waitForTimeout(4000)
  await page.screenshot({ path: 'C:/Users/Jorba/.gemini/antigravity/brain/ab5b9bdb-a516-4b5d-bc7f-166250ae927f/audit_5_cuenta.png' })

  // 6. Ir a Mis Publicaciones
  await page.goto('http://localhost:5173/mis-propiedades')
  await page.waitForTimeout(4000)
  await page.screenshot({ path: 'C:/Users/Jorba/.gemini/antigravity/brain/ab5b9bdb-a516-4b5d-bc7f-166250ae927f/audit_6_mis_propiedades.png' })

  if (consoleErrors.length > 0) {
    console.error('Errores de consola:', consoleErrors)
  }
  expect(consoleErrors.length).toBe(0)
})

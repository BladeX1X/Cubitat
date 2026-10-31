import { test, expect } from '@playwright/test'
import { assertLocalMutationTarget } from './qaTarget'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const E2E_EMAIL = process.env.CUBITAT_E2E_EMAIL
const E2E_PASSWORD = process.env.CUBITAT_E2E_PASSWORD
const ALLOW_MUTATIONS = process.env.CUBITAT_E2E_ALLOW_MUTATIONS === 'true'
const BASE_URL = process.env.CUBITAT_E2E_BASE_URL ?? 'http://127.0.0.1:5174'
const SUPABASE_URL = process.env.CUBITAT_E2E_SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? 'http://127.0.0.1:54321'

test('Login, publicar y mandar mensaje', async ({ page, request }, testInfo) => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'Definir CUBITAT_E2E_EMAIL y CUBITAT_E2E_PASSWORD')
  test.skip(!ALLOW_MUTATIONS, 'Definir CUBITAT_E2E_ALLOW_MUTATIONS=true para autorizar escrituras QA')
  assertLocalMutationTarget(BASE_URL, SUPABASE_URL)
  // Go to home
  await page.goto(`${BASE_URL}/`)
  await page.screenshot({ path: testInfo.outputPath('1_home.png') })

  // Open login modal
  await page.click('button:has-text("Ingresar")')
  await page.waitForSelector('input[type="email"]')

  // Fill credentials
  await page.fill('input[type="email"]', E2E_EMAIL!)
  await page.fill('input[type="password"]', E2E_PASSWORD!)
  await page.screenshot({ path: testInfo.outputPath('2_login_modal.png') })

  // Submit login
  await page.click('.login-modal-card button[type="submit"]')
  
  // Wait for user to be logged in
  await page.waitForSelector('button:has-text("Ingresar")', { state: 'detached', timeout: 15000 })
  await page.screenshot({ path: testInfo.outputPath('3_logged_in.png') })

  // Navigate to publish page
  await page.goto(`${BASE_URL}/publicar`)
  await page.waitForSelector('h1')
  await page.screenshot({ path: testInfo.outputPath('4_publicar_step1.png') })

  // --- Step 1: Dirección ---
  await page.locator('input[placeholder*="Ej: Calle 23"]').fill('Calle A #123 e/ B y C')
  await page.locator('button:has-text("Selecciona")').first().click()
  await page.locator('[role="option"]:has-text("La Habana")').click()
  await page.locator('button:has-text("Selecciona")').first().click()
  await page.locator('[role="option"]:has-text("Playa")').click()
  await page.locator('button:has-text("Continuar")').click()

  // --- Step 2: Info General ---
  await page.locator('button:has-text("Continuar")').click()

  // --- Step 3: Características ---
  await page.locator('#chk-unk-const').check()
  await page.locator('#chk-unk-land').check()
  await page.locator('button:has-text("Continuar")').click()

  // --- Step 4: Amenidades ---
  await page.locator('button:has-text("Continuar")').click()

  // --- Step 5: Descripción ---
  await page.locator('textarea').fill('Casa de prueba automatizada para testear el formulario de contacto y las notificaciones en tiempo real.')
  await page.locator('button:has-text("Continuar")').click()

  // --- Step 6: Imágenes ---
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  const imgPath = join(tmpdir(), `e2e-${Date.now()}.png`)
  writeFileSync(imgPath, pngBuffer)
  await page.setInputFiles('input[type="file"]', imgPath)
  await page.waitForTimeout(2000) // Wait for compression
  await page.locator('button:has-text("Continuar")').click()

  // --- Step 7: Precio ---
  await page.locator('input[type="number"]').first().fill('65000')
  await page.locator('button:has-text("Continuar")').click()

  // --- Step 8: Contacto ---
  await page.locator('input[placeholder*="Ej: Alejandro"]').fill('Anunciante Test')
  await page.locator('input[placeholder*="52345678"]').fill('59999999')
  await page.screenshot({ path: testInfo.outputPath('5_publicar_final.png') })

  // --- Submit ---
  await page.locator('button[type="submit"]').click()

  // Verify success
  await expect(page.locator('text=Publicación recibida')).toBeVisible({ timeout: 30000 })
  await page.screenshot({ path: testInfo.outputPath('6_publicada_exito.png') })

  // Wait redirect or go to mis-propiedades
  await page.goto(`${BASE_URL}/mis-propiedades`)
  await page.waitForSelector('text=Pendiente de revisión')
  await page.screenshot({ path: testInfo.outputPath('7_mis_propiedades.png') })

  // Get accessToken and userId from localStorage
  const sessionToken = await page.evaluate(() => {
    const raw = window.localStorage.getItem('cubitat-auth-token')
    return raw ? JSON.parse(raw) : null
  })
  const userId = sessionToken.user.id
  const accessToken = sessionToken.access_token

  // Fetch most recent property ID
  const propsRes = await request.get(
    `${BASE_URL}/api/supabase/rest/v1/properties?user_id=eq.${userId}&order=created_at.desc&limit=1`,
    { headers: { apikey: 'dummy-key-safe-from-browsers', Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
  )
  const props = await propsRes.json()
  const propId = props[0].id

  // Navigate to property detail page directly
  await page.goto(`${BASE_URL}/propiedad/${propId}`)
  await page.waitForTimeout(5000) // Wait for React to render
  await page.screenshot({ path: testInfo.outputPath('8_detalle_raw.png') })
  await page.waitForSelector('h1')
  await page.screenshot({ path: testInfo.outputPath('8_detalle_propiedad.png') })

  // Fill the contact form
  await page.fill('#contact-name', 'Cliente Interesado')
  await page.fill('#contact-phone', '+5351234567')
  await page.fill('#contact-message', 'Hola, este es un mensaje de prueba automática para verificar la base de datos y la notificación.')
  await page.screenshot({ path: testInfo.outputPath('9_mensaje_formulario.png') })

  // Submit contact message
  await page.click('button:has-text("Enviar mensaje y ver contacto")')
  
  // Wait for success feedback
  await expect(page.locator('text=¡Mensaje enviado!')).toBeVisible({ timeout: 15000 })
  await page.screenshot({ path: testInfo.outputPath('10_mensaje_enviado.png') })

  // Let's reload to see if we get the notifications badge updated!
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: testInfo.outputPath('11_notificaciones_recibidas.png') })

  // Open the notifications menu by clicking the notification bell
  await page.click('.notification-trigger')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: testInfo.outputPath('12_notificaciones_desplegadas.png') })
})

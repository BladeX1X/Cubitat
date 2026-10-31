import { test, expect } from '@playwright/test'
import { assertLocalMutationTarget } from './qaTarget'
import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const E2E_EMAIL = process.env.CUBITAT_E2E_EMAIL
const E2E_PASSWORD = process.env.CUBITAT_E2E_PASSWORD
const SUPABASE_URL = process.env.CUBITAT_E2E_SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? 'http://127.0.0.1:54321'
const BASE_URL = process.env.CUBITAT_E2E_BASE_URL ?? 'http://127.0.0.1:5174'
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ALLOW_MUTATIONS = process.env.CUBITAT_E2E_ALLOW_MUTATIONS === 'true'

test.describe('Publicación Real E2E', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'Salta: definir CUBITAT_E2E_EMAIL y CUBITAT_E2E_PASSWORD')
  test.skip(!ANON_KEY, 'Salta: definir VITE_SUPABASE_ANON_KEY')
  test.skip(!ALLOW_MUTATIONS, 'Salta: definir CUBITAT_E2E_ALLOW_MUTATIONS=true')

  test('flujo completo: login real → publicar → pending_review → no en resultados → limpiar', async ({ page, request }) => {
    assertLocalMutationTarget(BASE_URL, SUPABASE_URL)
    const qaMarker = `qa-e2e-publish-${Date.now()}`
    // 1. Login via Supabase Auth REST
    const authRes = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY!, 'Content-Type': 'application/json' },
      data: { email: E2E_EMAIL, password: E2E_PASSWORD },
    })
    expect(authRes.ok()).toBeTruthy()
    const session = await authRes.json()

    // 2. Inyectar sesión en el browser
    await page.goto('/')
    await page.evaluate((sess) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
        access_token: sess.access_token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expiresAt,
        refresh_token: sess.refresh_token,
        user: sess.user,
      }))
    }, session)
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 3. Navegar a publicar
    await page.goto('/publicar')
    await expect(page.locator('h1')).toHaveText('Publicar propiedad')

    // --- Step 1: Dirección ---
    const streetInput = page.locator('input[placeholder*="Ej: Calle 23"]')
    await expect(streetInput).toBeVisible()
    await streetInput.fill('Calle 23 #456 e/ H e I')

    await page.locator('button:has-text("Selecciona")').first().click()
    await page.locator('[role="option"]:has-text("La Habana")').click()

    await page.locator('button:has-text("Selecciona")').first().click()
    await page.locator('[role="option"]:has-text("Playa")').click()

    await page.locator('button:has-text("Continuar")').click()

    // --- Step 2: Info General (defaults: Casa, Venta) ---
    await page.locator('button:has-text("Continuar")').click()

    // --- Step 3: Características ---
    await page.locator('#chk-unk-const').check()
    await page.locator('#chk-unk-land').check()
    await page.locator('button:has-text("Continuar")').click()

    // --- Step 4: Amenidades (sin selección) ---
    await page.locator('button:has-text("Continuar")').click()

    // --- Step 5: Descripción ---
    await page.locator('textarea').fill(qaMarker)
    await page.locator('button:has-text("Continuar")').click()

    // --- Step 6: Imágenes ---
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
    const imgPath = join(tmpdir(), `e2e-${Date.now()}.png`)
    writeFileSync(imgPath, pngBuffer)
    await page.setInputFiles('input[type="file"]', imgPath)
    unlinkSync(imgPath)

    await expect(page.locator('text=Comprimiendo')).not.toBeVisible({ timeout: 15000 })
    await page.locator('button:has-text("Continuar")').click()

    // --- Step 7: Precio ---
    await page.locator('input[type="number"]').first().fill('50000')
    await page.locator('button:has-text("Continuar")').click()

    // --- Step 8: Contacto ---
    await page.locator('input[placeholder*="Ej: Alejandro"]').fill('Test E2E')
    await page.locator('input[placeholder*="52345678"]').fill('51234567')

    // --- Submit ---
    await page.locator('button[type="submit"]').click()

    // 4. Verificar feedback de éxito
    await expect(page.locator('text=Publicación recibida')).toBeVisible({ timeout: 45000 })

    // 5. Obtener token y user_id para cleanup
    const accessToken = await page.evaluate(() => {
      const raw = window.localStorage.getItem('cubitat-auth-token')
      return raw ? JSON.parse(raw).access_token : null
    })

    // Esperar redirect a home (3s timeout interno del wizard)
    await page.waitForURL(page.url().includes('publicar') ? '**/' : '/', { timeout: 15000 }).catch(() => {})

    // 6. Verificar que NO aparece en resultados (solo published)
    await page.goto('/resultados')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toBeVisible()

    // 7. Cleanup: borrar propiedad creada
    if (accessToken && session?.user?.id) {
      const propsRes = await request.get(
        `${SUPABASE_URL}/rest/v1/properties?user_id=eq.${session.user.id}&description=eq.${encodeURIComponent(qaMarker)}&select=id,status`,
        { headers: { apikey: ANON_KEY!, Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
      )

      if (propsRes.ok()) {
        const props = await propsRes.json()
        const recentProps = (Array.isArray(props) ? props : [])
          .filter((p: any) => p.status === 'pending_review')

        for (const prop of recentProps) {
          const authHeader = SERVICE_KEY
            ? `Bearer ${SERVICE_KEY}`
            : `Bearer ${accessToken}`

          const delRes = await request.delete(
            `${SUPABASE_URL}/rest/v1/properties?id=eq.${prop.id}`,
            { headers: { apikey: ANON_KEY!, Authorization: authHeader, 'Content-Type': 'application/json' } }
          )

          if (delRes.ok()) {
            console.log(`🧹 Propiedad ${prop.id} eliminada`)
          } else {
            console.warn(`⚠️  No se pudo eliminar ${prop.id}: ${delRes.status()}`)
          }
        }
      }
    }
  })
})

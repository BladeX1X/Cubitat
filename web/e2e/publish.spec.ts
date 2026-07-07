import { test, expect } from '@playwright/test'

test.describe('Flujo de Publicación de Inmuebles (Asistente 8 Pasos)', () => {
  test('debería guiar por los pasos de dirección, información, características y guardar borrador', async ({ page }) => {
    // Interceptar la llamada de validación del token de Supabase
    await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'bb4455b8-0330-440d-ace3-33d0ba5fc28a',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' },
          role: 'authenticated',
          aud: 'authenticated'
        })
      })
    })

    // 1. Navegar al Home primero para poder acceder a localStorage sin errores de seguridad de origen
    await page.goto('/')

    // 2. Establecer la sesión de Supabase ficticia con expires_at en el futuro
    await page.evaluate(() => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      window.localStorage.setItem(
        'cubitat-auth-token',
        JSON.stringify({
          access_token: 'dummy-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: expiresAt,
          refresh_token: 'dummy-refresh',
          user: {
            id: 'bb4455b8-0330-440d-ace3-33d0ba5fc28a',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' }
          }
        })
      )
    })

    // 3. Navegar a la página de publicar
    await page.goto('/publicar')

    // Verificar cabecera
    await expect(page.locator('h1')).toHaveText('Publicar propiedad')

    // 2. Paso 1: Dirección y Ubicación
    const streetInput = page.locator('input[placeholder*="Ej: Calle 23"]')
    await expect(streetInput).toBeVisible()
    await streetInput.fill('Calle 23 #456 e/ H e I')

    // Provincia
    const provinceSelect = page.locator('button:has-text("Selecciona")').first()
    await provinceSelect.click()
    
    // Seleccionar "La Habana" de las opciones
    await page.locator('[role="option"]:has-text("La Habana")').click()

    // El selector de municipios debería estar habilitado ahora
    const municipalitySelect = page.locator('button:has-text("Selecciona")').first()
    await municipalitySelect.click()
    await page.locator('[role="option"]:has-text("Playa")').click()

    // Clic en continuar
    await page.locator('button:has-text("Continuar")').click()

    // 3. Paso 2: Información General
    // Debería estar en el paso 2. Validamos el botón "Casa" que por defecto está seleccionado
    const casaBtn = page.locator('button:has-text("Casa")')
    await expect(casaBtn).toBeVisible()
    await expect(casaBtn).toHaveClass(/border-\[#035f53\]/) // Activo

    // Avanzar al Paso 3
    await page.locator('button:has-text("Continuar")').click()

    // 4. Paso 3: Características (Cuadrícula de contadores)
    const recamarasVal = page.locator('span:text-is("Recámaras") + div span')
    await expect(recamarasVal).toHaveText('1') // Valor por defecto

    // Clic en el botón más de Recámaras (el segundo botón en el panel de Recámaras)
    const plusRecamaras = page.locator('span:text-is("Recámaras") + div button').last()
    await plusRecamaras.click()
    await expect(recamarasVal).toHaveText('2') // Incrementado

    // 5. Test de Guardado de Borrador manual
    const saveBtn = page.locator('button:has-text("Guardar Borrador")')
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    // Feedback de borrador guardado visible
    await expect(page.locator('span:has-text("¡Borrador guardado!")')).toBeVisible()
  })
})

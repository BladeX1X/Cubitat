import { test, expect } from '@playwright/test'

test.describe('Flujo de Publicación de Inmuebles (Asistente 8 Pasos)', () => {
  test('debería guiar por los pasos de dirección, información, características y guardar borrador', async ({ page }) => {
    // 1. Navegar a la página de publicar
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

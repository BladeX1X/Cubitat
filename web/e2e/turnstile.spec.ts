import { test, expect } from '@playwright/test'
import { mockPublishedProperties } from './propertyFixtures'

test.describe('Cloudflare Turnstile Verification', () => {
  test('debería renderizar los widgets de Turnstile en los formularios correspondientes', async ({ page }) => {
    const duplicateKeyErrors: string[] = []
    const duplicateScriptWarnings: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('Encountered two children with the same key')) {
        duplicateKeyErrors.push(message.text())
      }
      if (message.text().includes('Turnstile already has been loaded')) {
        duplicateScriptWarnings.push(message.text())
      }
    })
    await mockPublishedProperties(page)

    // 1. Navegar directamente a la página de resultados
    await page.goto('/resultados')
    
    // Esperar a que las tarjetas de propiedad se carguen y se rendericen
    const firstCard = page.locator('.property-card').first()
    await expect(firstCard).toBeVisible({ timeout: 15000 })
    await firstCard.click()
    await expect(page).toHaveURL(/\/propiedad\//i)
    
    // 2. Verificar widget de Turnstile en el formulario de contacto (ContactCard)
    const contactTurnstile = page.locator('.turnstile-container[data-action="contact-owner"]')
    await expect(contactTurnstile).toBeVisible()
    
    // 3. Abrir modal de reportar y verificar widget de Turnstile
    const reportBtn = page.locator('button:has-text("Reportar propiedad sospechosa")')
    await reportBtn.click()

    const reportDialog = page.getByRole('dialog', { name: 'Informar sobre un problema' })
    await expect(reportDialog).toHaveAttribute('aria-modal', 'true')
    await expect(page.getByLabel('Motivo del reporte')).toHaveAttribute('required', '')
    await expect(page.getByLabel('Detalles adicionales')).not.toHaveAttribute('required', '')
    await expect(page.getByRole('button', { name: 'Enviar reporte' })).toBeDisabled()

    await page.keyboard.press('Escape')
    await expect(reportDialog).toBeHidden()
    await reportBtn.click()
    
    const reportTurnstile = page.locator('.turnstile-container[data-action="report-property"]')
    await expect(reportTurnstile).toBeVisible()
    
    // Cerrar modal de reportes pulsando el botón "Cancelar"
    const cancelReportBtn = page.locator('button:has-text("Cancelar")')
    await expect(cancelReportBtn).toBeVisible()
    await cancelReportBtn.click()
    await expect(reportTurnstile).toBeHidden()
    
    // 4. Abrir modal de autenticación y verificar widgets de Turnstile en Registro y Recuperación
    await page.click('button:has-text("Ingresar")')
    await page.waitForSelector('input[type="email"]')
    await expect(page.getByRole('button', { name: 'Google' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Facebook' })).toBeDisabled()

    // Ir a pestaña de registro
    const registerTabBtn = page.locator('button:has-text("Crear cuenta")')
    await registerTabBtn.click()
    
    const registerTurnstile = page.locator('.turnstile-container[data-action="register-user"]')
    await expect(registerTurnstile).toBeVisible()
    
    // Cambiar a recuperar contraseña (volviendo a iniciar sesión primero)
    const loginTabBtn = page.locator('button:has-text("Iniciar sesión")')
    await loginTabBtn.click()
    
    const forgotPasswordBtn = page.locator('button:has-text("Olvide mi contrasena")')
    await forgotPasswordBtn.click()
    
    const forgotTurnstile = page.locator('.turnstile-container[data-action="forgot-password"]')
    await expect(forgotTurnstile).toBeVisible()
    await expect(page.locator('script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]')).toHaveCount(1)
    expect(duplicateKeyErrors).toEqual([])
    expect(duplicateScriptWarnings).toEqual([])
  })
})

import { expect, test } from '@playwright/test'
import { mockPublishedProperties } from './propertyFixtures'

const propertyId = '33333333-3333-4333-8333-333333333333'

test('la ficha de Comprar consulta el canal privado solo al pulsar Consultar', async ({ page }) => {
  await mockPublishedProperties(page)
  let requestBody: unknown
  await page.route('**/api/public/property-contact', async route => {
    requestBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ phone: '+5350000001', whatsapp: '+5350000001' }),
    })
  })
  await page.route('https://wa.me/**', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<title>WhatsApp mock</title>',
  }))

  await page.goto(`/propiedad/${propertyId}`)
  await expect(page.getByRole('heading', { name: 'Apartamento QA en venta' })).toBeVisible({ timeout: 15_000 })

  const originalTimeOrigin = await page.evaluate(() => performance.timeOrigin)
  const popupPromise = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Consultar' }).first().click()
  const popup = await popupPromise

  await expect(popup).toHaveURL(/https:\/\/api\.whatsapp\.com\/send/)
  expect(new URL(popup.url()).searchParams.get('phone')).toBe('5350000001')
  expect(new URL(popup.url()).searchParams.get('text')).toContain('Apartamento QA en venta')
  expect(requestBody).toEqual({ property_id: propertyId })
  await expect(page).toHaveURL(new RegExp(`/propiedad/${propertyId}$`))
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(originalTimeOrigin)
})

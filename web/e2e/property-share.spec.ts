import { expect, test } from '@playwright/test'
import { mockPublishedProperties } from './propertyFixtures'

const propertyId = '33333333-3333-4333-8333-333333333333'

test('Compartir móvil mantiene una sola acción activa y no recarga la ficha', async ({ page }) => {
  await mockPublishedProperties(page)
  await page.route('**/api/property-view', route => route.fulfill({ status: 204, body: '' }))
  await page.addInitScript(() => {
    const qa = window as Window & { __qaShareCalls?: number }
    qa.__qaShareCalls = 0
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: () => {
        qa.__qaShareCalls = (qa.__qaShareCalls ?? 0) + 1
        return new Promise<void>(() => undefined)
      },
    })
  })

  await page.goto(`/propiedad/${propertyId}`)
  await expect(page.getByRole('heading', { name: 'Apartamento QA en venta' })).toBeVisible({ timeout: 15_000 })
  const shareButtons = page.getByRole('button', { name: 'Compartir propiedad' })
  const originalTimeOrigin = await page.evaluate(() => performance.timeOrigin)
  await shareButtons.first().click()

  await expect.poll(() => page.evaluate(() => (
    (window as Window & { __qaShareCalls?: number }).__qaShareCalls
  ))).toBe(1)
  await expect(shareButtons.first()).toBeDisabled()
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(originalTimeOrigin)
})

test('Compartir en escritorio copia el enlace sin abrir el selector nativo', async ({ page }) => {
  await mockPublishedProperties(page)
  await page.route('**/api/property-view', route => route.fulfill({ status: 204, body: '' }))
  await page.addInitScript(() => {
    const qa = window as Window & { __qaShareCalls?: number; __qaClipboardCalls?: number }
    qa.__qaShareCalls = 0
    qa.__qaClipboardCalls = 0
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
    })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: () => { qa.__qaShareCalls = (qa.__qaShareCalls ?? 0) + 1; return Promise.resolve() },
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { qa.__qaClipboardCalls = (qa.__qaClipboardCalls ?? 0) + 1 } },
    })
  })

  await page.goto(`/propiedad/${propertyId}`)
  await expect(page.getByRole('heading', { name: 'Apartamento QA en venta' })).toBeVisible({ timeout: 15_000 })
  const originalTimeOrigin = await page.evaluate(() => performance.timeOrigin)
  await page.getByRole('button', { name: 'Compartir propiedad' }).first().click()

  await expect(page.getByText('Copiado').first()).toBeVisible()
  expect(await page.evaluate(() => (window as Window & { __qaShareCalls?: number }).__qaShareCalls)).toBe(0)
  expect(await page.evaluate(() => (window as Window & { __qaClipboardCalls?: number }).__qaClipboardCalls)).toBe(1)
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(originalTimeOrigin)
})

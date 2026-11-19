import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

const localPaginationProperties = Array.from({ length: 61 }, (_, index) => ({
  id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
  title: `Permuta móvil QA ${index + 1}`,
  location: 'Peñas Altas, Matanzas',
  description: 'Propiedad sintética para revisar la paginación móvil.',
  zone_id: null,
  operation: 'permuta',
  property_type: 'casa',
  price_usd: 0,
  price_currency: 'USD',
  bedrooms: 2,
  bathrooms: 1,
  parking: 0,
  area_m2: 120,
  age_years: 10,
  amenities: [],
  badge: null,
  status: 'published',
  cover_tone: '#e5e7eb',
  cover_image: null,
  images: [],
  coordinates: { latitude: 23.04, longitude: -81.58 },
  contact_info: { name: 'Anunciante QA', phone: '+5350000000' },
  features: [],
  user_id: '22222222-2222-4222-8222-222222222222',
}))

for (const width of [320, 390, 430]) {
  test(`la paginación de Permutar cabe en ${width}px y cambia de página`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.route('**/rest/v1/properties**', async (route) => {
      const url = new URL(route.request().url())
      if (url.hostname !== '127.0.0.1' || route.request().method() !== 'GET') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': `0-${localPaginationProperties.length - 1}/${localPaginationProperties.length}` },
        body: JSON.stringify(localPaginationProperties),
      })
    })

    await page.goto('/resultados?operacion=permuta')
    await expect(page.locator('.property-card').first()).toBeVisible()

    const pagination = page.locator('.results-pagination')
    await expect(pagination).toBeVisible()
    await pagination.scrollIntoViewIfNeeded()
    const nextButton = pagination.getByRole('button', { name: 'Siguiente' })
    await expect(nextButton).toBeVisible()
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollWidth <= (visualViewport?.width ?? innerWidth) + 1,
    )).toBe(true)
    await expect.poll(() => nextButton.evaluate((element) => {
      const { left, right, height } = element.getBoundingClientRect()
      return left >= -1 && right <= (visualViewport?.width ?? innerWidth) + 1 && height >= 48
    })).toBe(true)

    await nextButton.click()
    await expect(pagination.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page')
  })
}

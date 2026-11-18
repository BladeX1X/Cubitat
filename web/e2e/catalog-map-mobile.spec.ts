import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

for (const { path, name } of [
  { path: '/servicios', name: 'Servicios' },
  { path: '/materiales', name: 'Materiales' },
]) {
  test(`${name}: abrir y cerrar el mapa en móvil sin desbordamiento`, async ({ page }) => {
    test.setTimeout(90_000)
    const mapResponses: Array<{ url: string; status: number }> = []
    page.on('response', response => {
      if (/maplibre-gl-worker|tiles\.openfreemap\.org/.test(response.url())) {
        mapResponses.push({ url: response.url(), status: response.status() })
      }
    })
    await page.route('**/rest/v1/home_service_providers**', async route => {
      if (new URL(route.request().url()).hostname === '127.0.0.1') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      } else await route.continue()
    })
    await page.route('**/rest/v1/material_listings**', async route => {
      if (new URL(route.request().url()).hostname === '127.0.0.1') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      } else await route.continue()
    })
    await page.goto(path)

    const siteHeader = page.locator('.site-header')
    const filterToolbar = page.locator('.marketplace-filter-toolbar')
    await expect(siteHeader).toBeVisible()
    await expect(filterToolbar).toBeVisible()
    await expect(siteHeader).toHaveCSS('position', 'relative')
    await page.evaluate(() => {
      document.body.style.minHeight = '200vh'
      window.scrollTo(0, 500)
    })
    await expect.poll(() => filterToolbar.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(8)
    await expect.poll(() => siteHeader.evaluate((element) => element.getBoundingClientRect().bottom < 0)).toBe(true)

    const openButton = page.getByRole('button', { name: 'Mostrar mapa' })
    await expect(openButton).toBeVisible({ timeout: 30_000 })
    await openButton.click()

    const mapDialog = page.getByRole('dialog')
    await expect(mapDialog).toBeVisible({ timeout: 30_000 })
    await expect(mapDialog.locator('.maplibregl-canvas')).toBeVisible({ timeout: 30_000 })
    await expect(mapDialog.getByText('Cargando mapa…')).toBeHidden({ timeout: 20_000 })
    await expect(mapDialog.getByText('No se pudo cargar el mapa')).toBeHidden()
    await expect(mapDialog.getByRole('button', { name: 'Cerrar mapa' })).toBeVisible()
    await expect.poll(() => mapResponses.some(response => /maplibre-gl-worker/.test(response.url) && response.status === 200), { timeout: 30_000 }).toBe(true)
    await expect.poll(() => mapResponses.some(response => /tiles\.openfreemap\.org\/(?:planet|natural_earth)\//.test(response.url) && response.status === 200), { timeout: 60_000 }).toBe(true)
    expect(mapResponses.filter(response => response.status >= 400)).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391)

    await mapDialog.getByRole('button', { name: 'Cerrar mapa' }).click()
    await expect(mapDialog).toBeHidden()
    await expect(page.getByRole('button', { name: 'Mostrar mapa' })).toBeVisible()
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  })
}

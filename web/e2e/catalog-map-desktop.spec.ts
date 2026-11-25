import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

for (const { path, name } of [
  { path: '/servicios', name: 'Servicios' },
  { path: '/materiales', name: 'Materiales' },
]) {
  test(`${name}: muestra el mapa de Cuba junto al catálogo y permite cerrarlo desde el control flotante`, async ({ page }) => {
    test.setTimeout(90_000)
    for (const table of ['home_service_providers', 'material_listings']) {
      await page.route(`**/rest/v1/${table}**`, async route => {
        if (route.request().method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': '*', 'access-control-max-age': '86400' } })
          return
        }
        await route.fulfill({ status: 200, headers: { 'content-range': '*/0', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' }, contentType: 'application/json', body: '[]' })
      })
    }
    await page.goto(path)

    const layout = page.locator('.marketplace-directory-layout')
    const openMapButton = page.getByRole('button', { name: 'Mostrar mapa' })
    const floatingActions = page.locator('.marketplace-map-floating-actions')
    await expect(openMapButton).toBeVisible({ timeout: 30_000 })
    await expect(floatingActions).toHaveCSS('position', 'fixed')
    await expect(floatingActions).toHaveCSS('bottom', /\d+px/)
    await openMapButton.click()

    const mapPanel = page.locator('.marketplace-directory-map')
    await expect(layout).toHaveClass(/is-map-open/)
    await expect(mapPanel).toBeVisible()
    await expect(mapPanel.locator('.maplibregl-canvas')).toBeVisible({ timeout: 30_000 })
    await expect(mapPanel.getByText('Cargando mapa…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Ocultar mapa' })).toBeVisible()
    await expect(layout.locator('.marketplace-directory-results')).toBeVisible()

    const mapBounds = await mapPanel.boundingBox()
    expect(mapBounds).not.toBeNull()
    expect(mapBounds!.x).toBeGreaterThan(400)
    expect(mapBounds!.width).toBeGreaterThan(300)
    expect(mapBounds!.y).toBeGreaterThanOrEqual(0)

    await page.getByRole('button', { name: 'Ocultar mapa' }).click()
    await expect(layout).not.toHaveClass(/is-map-open/)
    await expect(mapPanel).toBeHidden()
    await expect(page.getByRole('button', { name: 'Mostrar mapa' })).toBeVisible()
  })
}

import { expect, test, type Page } from '@playwright/test'
import { mockDirectSupabaseReads } from './propertyFixtures'

async function openPublicationAddressStep(page: Page) {
  await mockDirectSupabaseReads(page)
  await page.route('**/auth/v1/user', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'bb4455b8-0330-440d-ace3-33d0ba5fc28a',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
        role: 'authenticated',
        aud: 'authenticated',
      }),
    })
  })

  await page.goto('/')
  await page.evaluate(() => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'dummy-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: 'dummy-refresh',
      user: {
        id: 'bb4455b8-0330-440d-ace3-33d0ba5fc28a',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      },
    }))
  })

  await page.goto('/publicar-inmueble')
  await expect(page.getByRole('heading', { name: 'Publicar propiedad' })).toBeVisible()
  await page.getByRole('button', { name: 'Selecciona' }).first().click()
  await page.locator('[role="option"]:has-text("La Habana")').click()
  await page.getByRole('button', { name: 'Selecciona' }).last().click()
  await page.locator('[role="option"]:has-text("Playa")').click()
}

test('publicar dibuja el mapa, carga sus teselas y actualiza la ubicación marcada', async ({ page }) => {
  test.setTimeout(90_000)
  const mapResponses: Array<{ url: string; status: number }> = []
  page.on('response', response => {
    const url = response.url()
    if (/maplibre-gl-worker|tiles\.openfreemap\.org/.test(url)) {
      mapResponses.push({ url, status: response.status() })
    }
  })

  await openPublicationAddressStep(page)

  const mapCanvas = page.locator('.maplibregl-canvas')
  await expect(mapCanvas).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('status').filter({ hasText: 'Cargando mapa' })).toBeHidden({ timeout: 30_000 })
  await expect.poll(() => mapCanvas.evaluate(canvas => canvas.clientWidth * canvas.clientHeight)).toBeGreaterThan(0)
  await expect.poll(() => mapResponses.some(response => /maplibre-gl-worker/.test(response.url) && response.status === 200)).toBe(true)
  await expect.poll(() => mapResponses.some(response => /tiles\.openfreemap\.org/.test(response.url) && response.status === 200)).toBe(true)
  expect(mapResponses.filter(response => response.status >= 400)).toEqual([])

  await mapCanvas.click({ position: { x: 160, y: 150 } })
  await expect(page.getByText('Ubicación marcada')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Quitar' })).toBeVisible()
  const selectedCoordinates = await page.locator('.font-mono').innerText()
  await page.getByRole('button', { name: 'Guardar Borrador' }).click()
  await expect(page.getByText('¡Borrador guardado!')).toBeVisible()
  await page.goto('/mis-propiedades')
  const savedDraft = page.locator('div.rounded-2xl').filter({ hasText: 'Casa en venta en Playa (Borrador)' })
  await expect(savedDraft).toHaveCount(1)
  await savedDraft.getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByRole('heading', { name: 'Publicar propiedad' })).toBeVisible()
  await expect(page.getByText('Ubicación marcada')).toBeVisible()
  await expect(page.locator('.font-mono')).toHaveText(selectedCoordinates)
})

test('publicar permite reintentar si falla el estilo del mapa', async ({ page }) => {
  test.setTimeout(90_000)
  let styleRequests = 0
  await page.route('https://tiles.openfreemap.org/styles/liberty', async route => {
    styleRequests += 1
    if (styleRequests === 1) {
      await route.abort('failed')
      return
    }
    await route.continue()
  })

  await openPublicationAddressStep(page)
  await expect(page.getByRole('alert')).toContainText('No se pudo cargar el mapa', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Reintentar mapa' }).click()
  await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(styleRequests).toBeGreaterThanOrEqual(2)
})

test('publicar conserva el mapa si falla una tesela individual', async ({ page }) => {
  test.setTimeout(90_000)
  let failedTileRequest = false
  const deterministicTileStyle = {
    version: 8,
    sources: {
      qa: {
        type: 'vector',
        tiles: ['https://tiles.openfreemap.org/qa/{z}/{x}/{y}.pbf'],
        minzoom: 0,
        maxzoom: 14,
      },
    },
    layers: [{
      id: 'qa-vector-layer',
      type: 'circle',
      source: 'qa',
      'source-layer': 'qa',
      paint: { 'circle-radius': 4, 'circle-color': '#035f53' },
    }],
  }
  await page.route('https://tiles.openfreemap.org/styles/liberty', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(deterministicTileStyle),
  }))
  await page.route('https://tiles.openfreemap.org/qa/**', async route => {
    if (!failedTileRequest && new URL(route.request().url()).pathname.endsWith('.pbf')) {
      failedTileRequest = true
      await route.abort('failed')
      return
    }
    await route.continue()
  })

  await openPublicationAddressStep(page)
  const mapCanvas = page.locator('.maplibregl-canvas')
  await expect(mapCanvas).toBeVisible({ timeout: 30_000 })
  await expect.poll(() => failedTileRequest).toBe(true)
  await expect(page.getByRole('status').filter({ hasText: 'Cargando mapa' })).toBeHidden({ timeout: 30_000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(mapCanvas).toBeVisible()
})

test('publicar permite marcar una ubicación en el mapa desde un viewport móvil', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await openPublicationAddressStep(page)

  const mapCanvas = page.locator('.maplibregl-canvas')
  await expect(mapCanvas).toBeVisible({ timeout: 30_000 })
  await expect.poll(() => mapCanvas.evaluate(canvas => canvas.clientWidth * canvas.clientHeight)).toBeGreaterThan(0)
  await mapCanvas.click({ position: { x: 150, y: 140 } })
  await expect(page.getByText('Ubicación marcada')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391)
})

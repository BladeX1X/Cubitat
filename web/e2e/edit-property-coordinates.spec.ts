import { expect, test } from '@playwright/test'

test('la ubicación marcada en el mapa se incluye al guardar la edición', async ({ page }) => {
  test.setTimeout(90_000)
  const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
  const propertyId = 'qa-edit-map-coordinates'
  const existingImage = `/api/supabase/storage/v1/object/property_images/${ownerId}/11111111-1111-4111-8111-111111111111.webp`
  let propertyUpdate: Record<string, unknown> | null = null

  await page.route('**/api/supabase/**', async route => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        id: ownerId,
        email: 'qa@example.com',
        user_metadata: { full_name: 'Cuenta QA' },
        role: 'authenticated',
        aud: 'authenticated',
      }) })
      return
    }

    if (url.pathname.endsWith(existingImage)) {
      await route.fulfill({ status: 200, contentType: 'image/webp', body: Buffer.from('RIFF0000WEBPVP8 ', 'ascii') })
      return
    }

    if (url.pathname.endsWith('/rest/v1/properties') && request.method() === 'GET'
      && url.searchParams.get('id') === `eq.${propertyId}`) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        id: propertyId,
        user_id: ownerId,
        title: 'Casa QA en Playa',
        operation: 'venta',
        property_type: 'casa',
        description: 'Casa de prueba para comprobar la ubicación marcada en el mapa.',
        price_usd: 68000,
        location: 'Calle 10 #12, Playa, La Habana',
        property_private_addresses: { location: 'Calle 10 #12, Playa, La Habana' },
        property_private_coordinates: { coordinates: null },
        property_contact_details: { name: 'Anunciante QA', phone: '+53512345678' },
        bedrooms: 2,
        bathrooms: 1,
        parking: 1,
        area_m2: 100,
        age_years: 5,
        amenities: [],
        features: { constructionSize: '100', levels: 1 },
        cover_image: existingImage,
        images: [existingImage],
        status: 'published',
        coordinates: null,
      }) })
      return
    }

    if (url.pathname.endsWith('/rest/v1/properties') && request.method() === 'PATCH') {
      propertyUpdate = request.postDataJSON() as Record<string, unknown>
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: propertyId }) })
      return
    }

    if (url.pathname.includes('/rest/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.route('**/api/ai-moderate', route => route.fulfill({ status: 202, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/phase2/property-image-duplicates', route => route.fulfill({ status: 202, contentType: 'application/json', body: '{}' }))

  await page.goto('/')
  await page.evaluate(owner => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'dummy-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: 'dummy-refresh',
      user: { id: owner, email: 'qa@example.com', user_metadata: { full_name: 'Cuenta QA' } },
    }))
  }, ownerId)

  await page.goto(`/editar/${propertyId}`)
  await expect(page.getByRole('heading', { name: 'Editar propiedad' })).toBeVisible()
  const mapCanvas = page.locator('.maplibregl-canvas')
  await expect(mapCanvas).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('status').filter({ hasText: 'Cargando mapa' })).toBeHidden({ timeout: 30_000 })
  await mapCanvas.click({ position: { x: 180, y: 150 } })
  await expect(page.getByText('Ubicación marcada')).toBeVisible()

  const selectedCoordinatesText = await page.locator('.font-mono').innerText()
  const selectedCoordinates = selectedCoordinatesText.split(',').map(value => Number(value.trim()))
  expect(selectedCoordinates).toHaveLength(2)
  expect(selectedCoordinates.every(Number.isFinite)).toBe(true)

  for (let step = 2; step <= 8; step += 1) {
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.locator('.publish-progress-summary span').first()).toHaveText(`Paso ${step} de 8`)
  }

  await page.getByRole('button', { name: 'Guardar Cambios' }).last().click()
  await expect(page.getByRole('heading', { name: '¡Publicación recibida!' })).toBeVisible()
  expect(propertyUpdate).not.toBeNull()
  const savedCoordinates = propertyUpdate?.coordinates as { latitude: number; longitude: number } | null
  expect(savedCoordinates).not.toBeNull()
  expect(Number(savedCoordinates!.latitude.toFixed(5))).toBe(selectedCoordinates[0])
  expect(Number(savedCoordinates!.longitude.toFixed(5))).toBe(selectedCoordinates[1])
  expect(propertyUpdate?.status).toBe('pending_review')
})

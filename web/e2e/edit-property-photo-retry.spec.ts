import { expect, test } from '@playwright/test'

test('reanuda la edición en Imágenes, conserva la foto privada y guarda una nueva a revisión', async ({ page }) => {
  const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
  const propertyId = '7a2178c8-e5da-4b39-912a-15b57d5c72ea'
  const originalImage = `/api/supabase/storage/v1/object/property_images/${ownerId}/11111111-1111-4111-8111-111111111111.webp`
  const uploadedPath = `${ownerId}/22222222-2222-4222-8222-222222222222.webp`
  let propertyUpdate: Record<string, unknown> | null = null
  let uploadedContentType = ''

  await page.route('**/api/supabase/**', async route => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: ownerId, email: 'qa@example.com', user_metadata: { full_name: 'QA local' }, role: 'authenticated', aud: 'authenticated' }),
      })
      return
    }

    if (url.pathname.endsWith(`/storage/v1/object/property_images/${ownerId}/11111111-1111-4111-8111-111111111111.webp`)) {
      await route.fulfill({ status: 200, contentType: 'image/webp', body: Buffer.from('RIFF0000WEBPVP8 ', 'ascii') })
      return
    }

    if (url.pathname.endsWith('/rest/v1/properties') && request.method() === 'GET'
      && url.searchParams.get('id') === `eq.${propertyId}`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: propertyId,
          user_id: ownerId,
          title: 'Casa QA en Playa',
          operation: 'venta',
          property_type: 'casa',
          description: 'Descripción original de la propiedad para edición QA.',
          price_usd: 68000,
          location: 'Calle 23 #10, Playa, La Habana',
          property_private_addresses: { location: 'Calle 23 #10, Playa, La Habana' },
          property_private_coordinates: { coordinates: null },
          property_contact_details: { name: 'Anunciante QA', phone: '+53512345678' },
          bedrooms: 2,
          bathrooms: 1,
          parking: 1,
          area_m2: 100,
          age_years: 5,
          amenities: [],
          features: { constructionSize: '100', levels: 1 },
          cover_image: originalImage,
          images: [originalImage],
          status: 'published',
          coordinates: null,
        }),
      })
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
  await page.route('**/api/property-images/upload', async route => {
    uploadedContentType = route.request().headers()['content-type'] ?? ''
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ path: uploadedPath }) })
  })
  await page.route('**/api/ai-moderate', route => route.fulfill({ status: 202, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/phase2/property-image-duplicates', route => route.fulfill({ status: 202, contentType: 'application/json', body: '{}' }))

  await page.goto('/')
  await page.evaluate(async ({ ownerId: id, propertyId: editedId, originalImage: image }) => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'dummy-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
      refresh_token: 'dummy-refresh',
      user: { id, email: 'qa@example.com', user_metadata: { full_name: 'QA local' } },
    }))
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('cubitat-publication-drafts', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('drafts')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readwrite')
      transaction.objectStore('drafts').put({
        formData: {},
        images: [{ dataUrl: image, size: 0, name: 'existing-0.webp' }],
        step: 6,
        existingAmenities: [],
        edited: true,
      }, JSON.stringify([id, editedId]))
      transaction.oncomplete = () => { database.close(); resolve() }
      transaction.onerror = () => { database.close(); reject(transaction.error) }
    })
  }, { ownerId, propertyId, originalImage })
  await page.goto(`/editar/${propertyId}`)

  await expect(page.getByRole('heading', { name: 'Editar propiedad' })).toBeVisible()
  await expect(page.locator('.publish-progress-summary span').first()).toHaveText('Paso 6 de 8')
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0)

  const originalPreview = page.getByRole('group', { name: 'Foto 1: existing-0.webp' })
  await expect(originalPreview).toBeVisible()
  await expect(originalPreview.locator('div.absolute.inset-0')).toHaveAttribute('style', /blob:/)
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('src/assets/hero.png')
  const newPreview = page.getByRole('group', { name: /Foto 2:/ })
  await expect(newPreview).toBeVisible()
  await expect(newPreview.locator('div.absolute.inset-0')).toHaveAttribute('style', /data:image\/webp;base64,/i)

  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Guardar Cambios' }).first().click()
  await expect(page.getByRole('heading', { name: '¡Publicación recibida!' })).toBeVisible()

  expect(uploadedContentType).toBe('image/webp')
  expect(propertyUpdate).not.toBeNull()
  expect(propertyUpdate?.user_id).toBeUndefined()
  const originalImageUrl = `${new URL(page.url()).origin}${originalImage}`
  expect(propertyUpdate).toMatchObject({ status: 'pending_review', cover_image: originalImageUrl })
  expect(propertyUpdate?.images).toEqual([originalImageUrl, `${new URL(page.url()).origin}/api/supabase/storage/v1/object/property_images/${uploadedPath}`])
  expect(propertyUpdate?.contact_info).toEqual({ name: 'Anunciante QA', phone: '+53512345678' })
})

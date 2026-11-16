import { expect, test } from '@playwright/test'
import { mockDirectSupabaseReads } from './propertyFixtures'

test('el asistente de publicación conserva sus pasos dentro del viewport móvil', async ({ page }) => {
  const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
  await page.setViewportSize({ width: 320, height: 740 })
  await mockDirectSupabaseReads(page)
  await page.route('**/api/supabase/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: ownerId, email: 'test@example.com', user_metadata: { full_name: 'Test User' }, role: 'authenticated', aud: 'authenticated' }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  const expectNoOverflow = async () => {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
  }

  await page.goto('/')
  await page.evaluate(owner => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'dummy-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
      refresh_token: 'dummy-refresh', user: { id: owner, email: 'test@example.com', user_metadata: { full_name: 'Test User' } },
    }))
  }, ownerId)
  await page.goto('/publicar')
  await expect(page.getByRole('heading', { name: 'Publicar propiedad' })).toBeVisible()
  await expectNoOverflow()

  await page.getByPlaceholder('Ej: Calle 23 #456 e/ H e I').fill('Calle QA s/n')
  await page.getByRole('button', { name: 'Selecciona' }).first().click()
  await page.getByRole('option', { name: 'La Habana' }).click()
  await page.getByRole('button', { name: 'Selecciona' }).first().click()
  await page.getByRole('option', { name: 'Playa' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expectNoOverflow()

  await page.getByRole('button', { name: 'Continuar' }).click()
  await expectNoOverflow()
  await page.getByPlaceholder('Ej: 90').fill('90')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expectNoOverflow()

  await page.getByRole('button', { name: 'Continuar' }).click()
  await expectNoOverflow()
  await page.getByPlaceholder(/describe la construcción/i).fill('Descripción suficiente para revisar la publicación en un teléfono móvil.')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expectNoOverflow()

  await page.locator('input[type="file"]').setInputFiles('src/assets/hero.png')
  await expect(page.getByRole('group', { name: /Foto 1:/ })).toBeVisible()
  await expectNoOverflow()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expectNoOverflow()
  await page.getByPlaceholder('Ej: 45000').fill('68000')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expectNoOverflow()
  await page.getByPlaceholder('Ej: Alejandro Gómez').fill('Test User')
  await page.getByPlaceholder('Ej: +52 55 1234 5678').fill('+525512345678')
  await expectNoOverflow()
})

test('el editor permite reintentar la vista previa de una foto privada', async ({ page }) => {
  const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
  const propertyId = 'qa-edit-private-photo-retry'
  const photoId = '22222222-2222-4222-8222-222222222222'
  const photoUrl = `/api/supabase/storage/v1/object/property_images/${ownerId}/${photoId}.webp`
  let previewDownloads = 0
  let propertyWrites = 0

  await page.route('**/api/supabase/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        id: ownerId,
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
        role: 'authenticated',
        aud: 'authenticated',
      }) })
      return
    }
    if (url.pathname.endsWith('/rest/v1/properties') && request.method() === 'GET'
      && url.searchParams.get('id') === `eq.${propertyId}`) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        id: propertyId,
        user_id: ownerId,
        title: 'Casa QA para reintento de foto',
        operation: 'venta',
        property_type: 'casa',
        description: 'Propiedad sintética para probar el reintento de una vista previa.',
        price_usd: 68000,
        location: 'Calle 10 #12, Playa, La Habana',
        bedrooms: 2,
        bathrooms: 1,
        parking: 0,
        area_m2: 90,
        age_years: 5,
        amenities: [],
        features: { constructionSize: '90' },
        images: [photoUrl],
        property_private_addresses: { location: 'Calle 10 #12, Playa, La Habana' },
        property_private_coordinates: null,
        property_contact_details: { name: 'Test User', phone: '+5350000000', email: '' },
      }) })
      return
    }
    if (url.pathname.endsWith('/rest/v1/properties') && request.method() !== 'GET') propertyWrites += 1
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/api/supabase/storage/v1/object/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.includes('/property_images/')) {
      await route.fallback()
      return
    }
    previewDownloads += 1
    if (previewDownloads <= 2) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporary storage outage' }) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'image/webp',
      body: Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==', 'base64'),
    })
  })

  await page.goto('/')
  await page.evaluate(owner => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'dummy-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: 'dummy-refresh',
      user: { id: owner, email: 'test@example.com', user_metadata: { full_name: 'Test User' } },
    }))
  }, ownerId)
  await page.goto(`/editar/${propertyId}`)
  await expect(page.getByRole('heading', { name: 'Editar propiedad' })).toBeVisible()
  await page.getByRole('button', { name: 'Imágenes' }).click()

  const photo = page.getByRole('group', { name: 'Foto 1: existing-0.webp' })
  await expect(photo.getByRole('status')).toHaveText('No se pudo cargar esta foto.')
  await page.getByRole('button', { name: 'Reintentar carga de Foto 1' }).click()
  await expect(photo.locator('div').first()).toHaveAttribute('style', /blob:/)
  await expect(photo.getByRole('status')).toHaveCount(0)
  expect(previewDownloads).toBe(3)
  expect(propertyWrites).toBe(0)
})

test('la foto seleccionada se procesa y aparece con miniatura y tamaño válido', async ({ page }) => {
  const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'

  await mockDirectSupabaseReads(page)
  await page.route('**/api/supabase/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: ownerId, email: 'test@example.com', user_metadata: { full_name: 'Test User' }, role: 'authenticated', aud: 'authenticated' }),
      })
      return
    }
    if (url.pathname.includes('/rest/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  await page.goto('/')
  await page.evaluate(ownerId => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'dummy-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
      refresh_token: 'dummy-refresh',
      user: { id: ownerId, email: 'test@example.com', user_metadata: { full_name: 'Test User' } },
    }))
  }, ownerId)
  await page.goto('/publicar')

  await expect(page.getByRole('heading', { name: 'Publicar propiedad' })).toBeVisible()
  await page.getByPlaceholder('Ej: Calle 23 #456 e/ H e I').fill('Calle QA s/n')
  await page.locator('button:has-text("Selecciona")').first().click()
  await page.getByRole('option', { name: 'La Habana' }).click()
  await page.locator('button:has-text("Selecciona")').first().click()
  await page.getByRole('option', { name: 'Playa' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByPlaceholder('Ej: 90').fill('90')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByPlaceholder(/describe la construcción/i).fill('Prueba visual local del procesamiento de una fotografía.')
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.locator('input[type="file"]').setInputFiles(['src/assets/hero.png', 'src/assets/hero.png'])
  const photos = [
    page.getByRole('group', { name: /Foto 1:/ }),
    page.getByRole('group', { name: /Foto 2:/ }),
  ]
  for (const photo of photos) {
    await expect(photo).toBeVisible()
    const imageStyle = await photo.locator('div.absolute.inset-0').getAttribute('style')
    expect(imageStyle).toMatch(/data:image\/webp;base64,/i)
    const sizeLabel = await photo.locator('span').allTextContents()
    const sizeKb = Number.parseFloat(sizeLabel.find(text => text.includes('KB')) ?? '0')
    expect(sizeKb).toBeGreaterThan(0)
  }
  await expect(page.getByRole('group', { name: /Foto [12]:/ })).toHaveCount(2)
  await expect(page.getByText(/Comprimiendo y convirtiendo imágenes/i)).toHaveCount(0)
})

test('conserva todas las fotos tras un fallo y las guarda al reintentar', async ({ page }) => {
  const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
  const uploadedPaths = [
    `${ownerId}/11111111-1111-4111-8111-111111111111.webp`,
    `${ownerId}/22222222-2222-4222-8222-222222222222.webp`,
  ]
  const uploadRequests: Array<{ contentType: string; size: number; status: number }> = []
  let propertyPayload: Record<string, unknown> | null = null
  let propertyInsertCount = 0

  await mockDirectSupabaseReads(page)
  await page.route('**/api/supabase/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: ownerId, email: 'test@example.com', user_metadata: { full_name: 'Test User' }, role: 'authenticated', aud: 'authenticated' }),
      })
      return
    }
    if (request.method() === 'POST' && url.pathname.endsWith('/rest/v1/properties')) {
      propertyInsertCount += 1
      propertyPayload = request.postDataJSON() as Record<string, unknown>
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'qa-property-with-images' }) })
      return
    }
    if (url.pathname.includes('/rest/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.route('**/api/property-images/upload', async route => {
    const requestBody = route.request().postDataBuffer() ?? Buffer.alloc(0)
    const uploadAttempt = uploadRequests.length + 1
    const fails = uploadAttempt === 2
    uploadRequests.push({ contentType: route.request().headers()['content-type'] ?? '', size: requestBody.byteLength, status: fails ? 500 : 201 })
    if (fails) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'temporary_storage_failure' }) })
      return
    }
    const path = uploadedPaths[(uploadAttempt - 1) % uploadedPaths.length]
    if (!path) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'unexpected_upload' }) })
      return
    }
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ path }) })
  })
  await page.route('**/api/ai-moderate', route => route.fulfill({ status: 202, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/phase2/property-image-duplicates', route => route.fulfill({ status: 202, contentType: 'application/json', body: '{}' }))

  await page.goto('/')
  await page.evaluate(ownerId => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'dummy-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
      refresh_token: 'dummy-refresh',
      user: { id: ownerId, email: 'test@example.com', user_metadata: { full_name: 'Test User' } },
    }))
  }, ownerId)
  await page.goto('/publicar')

  await expect(page.getByRole('heading', { name: 'Publicar propiedad' })).toBeVisible()
  await page.getByPlaceholder('Ej: Calle 23 #456 e/ H e I').fill('Calle QA s/n')
  await page.locator('button:has-text("Selecciona")').first().click()
  await page.getByRole('option', { name: 'La Habana' }).click()
  await page.locator('button:has-text("Selecciona")').first().click()
  await page.getByRole('option', { name: 'Playa' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByPlaceholder('Ej: 90').fill('90')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByPlaceholder(/describe la construcción/i).fill('Anuncio sintético E2E para comprobar el envío de varias fotos en DEV simulado.')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.locator('input[type="file"]').setInputFiles(['src/assets/hero.png', 'src/assets/hero.png'])
  await expect(page.getByRole('group', { name: /Foto 2:/ })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByPlaceholder('Ej: 45000').fill('68000')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByPlaceholder('Ej: Alejandro Gómez').fill('Test User')
  await page.getByPlaceholder('Ej: +52 55 1234 5678').fill('+525512345678')
  let uploadErrorMessage = ''
  page.once('dialog', async dialog => {
    uploadErrorMessage = dialog.message()
    await dialog.accept()
  })
  await page.getByRole('button', { name: 'Publicar Propiedad' }).click()

  await expect.poll(() => uploadErrorMessage).toBe('No se subieron todas las fotos. Tus datos y fotos se conservan para reintentar.')
  expect(propertyInsertCount).toBe(0)
  expect(propertyPayload).toBeNull()
  await page.getByRole('button', { name: 'Atrás' }).click()
  await page.getByRole('button', { name: 'Atrás' }).click()
  await expect(page.getByRole('group', { name: /Foto 1:/ })).toBeVisible()
  await expect(page.getByRole('group', { name: /Foto 2:/ })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByRole('button', { name: 'Publicar Propiedad' }).click()

  await expect(page.getByRole('heading', { name: '¡Publicación recibida!' })).toBeVisible()
  expect(uploadRequests).toHaveLength(4)
  expect(uploadRequests.map(upload => upload.status)).toEqual([201, 500, 201, 201])
  expect(uploadRequests.every(upload => upload.contentType === 'image/webp' && upload.size > 0)).toBe(true)
  expect(propertyInsertCount).toBe(1)
  expect(propertyPayload).not.toBeNull()
  const images = propertyPayload?.images as string[]
  expect(images).toEqual(uploadedPaths.map(path => `${page.url().replace(/\/publicar$/, '')}/api/supabase/storage/v1/object/property_images/${path}`))
  expect(propertyPayload?.cover_image).toBe(images[0])
  expect(propertyPayload?.user_id).toBe(ownerId)
  expect(propertyPayload?.status).toBe('pending_review')
})

test('limpia solo la foto nueva cuando la propiedad se rechaza por permisos', async ({ page }) => {
  const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
  const uploadedPath = `${ownerId}/33333333-3333-4333-8333-333333333333.webp`
  const cleanupRequests: Array<{ method: string; path: string; body: unknown }> = []
  let propertyWriteCount = 0

  await mockDirectSupabaseReads(page)
  await page.route('**/api/supabase/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: ownerId, email: 'test@example.com', user_metadata: { full_name: 'Test User' }, role: 'authenticated', aud: 'authenticated' }),
      })
      return
    }
    if (request.method() === 'POST' && url.pathname.endsWith('/rest/v1/properties')) {
      propertyWriteCount += 1
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: '42501', message: 'permission denied' }) })
      return
    }
    if (url.pathname.includes('/storage/v1/object/')) {
      cleanupRequests.push({ method: request.method(), path: url.pathname, body: request.postDataJSON() })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) })
      return
    }
    if (url.pathname.includes('/rest/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.route('**/api/property-images/upload', async route => {
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ path: uploadedPath }) })
  })

  await page.goto('/')
  await page.evaluate(ownerId => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'dummy-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
      refresh_token: 'dummy-refresh',
      user: { id: ownerId, email: 'test@example.com', user_metadata: { full_name: 'Test User' } },
    }))
  }, ownerId)
  await page.goto('/publicar')

  await expect(page.getByRole('heading', { name: 'Publicar propiedad' })).toBeVisible()
  await page.getByPlaceholder('Ej: Calle 23 #456 e/ H e I').fill('Calle QA s/n')
  await page.locator('button:has-text("Selecciona")').first().click()
  await page.getByRole('option', { name: 'La Habana' }).click()
  await page.locator('button:has-text("Selecciona")').first().click()
  await page.getByRole('option', { name: 'Playa' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByPlaceholder('Ej: 90').fill('90')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByPlaceholder(/describe la construcción/i).fill('Prueba sintética del rechazo de permisos y la limpieza de la foto sin referencia.')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.locator('input[type="file"]').setInputFiles('src/assets/hero.png')
  await expect(page.getByRole('group', { name: /Foto 1:/ })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByPlaceholder('Ej: 45000').fill('68000')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByPlaceholder('Ej: Alejandro Gómez').fill('Test User')
  await page.getByPlaceholder('Ej: +52 55 1234 5678').fill('+525512345678')

  let errorMessage = ''
  page.once('dialog', async dialog => {
    errorMessage = dialog.message()
    await dialog.accept()
  })
  await page.getByRole('button', { name: 'Publicar Propiedad' }).click()

  await expect.poll(() => errorMessage).toMatch(/cuenta que la publicó/i)
  await page.getByRole('button', { name: 'Imágenes' }).click()
  await expect(page.getByRole('group', { name: /Foto 1:/ })).toBeVisible()
  expect(propertyWriteCount).toBe(1)
  expect(cleanupRequests).toHaveLength(1)
  expect(cleanupRequests[0]?.path).toMatch(/\/storage\/v1\/object\/property_images$/)
  expect(cleanupRequests[0]?.body).toEqual({ prefixes: [uploadedPath] })
})

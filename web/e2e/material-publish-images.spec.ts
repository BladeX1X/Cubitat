import { expect, test } from '@playwright/test'
import { mockDirectSupabaseReads } from './propertyFixtures'

async function materialStep(page: import('@playwright/test').Page, label: string) {
  const labels = ['Producto', 'Ubicación', 'Precio y detalles', 'Fotos', 'Contacto']
  const target = labels.indexOf(label)
  if (target < 0) throw new Error(`Paso desconocido: ${label}`)
  let current = labels.indexOf((await page.getByRole('heading', { level: 2 }).innerText()).trim())
  while (current < target) {
    await page.getByRole('button', { name: 'Continuar' }).click()
    current += 1
    await expect(page.getByRole('heading', { level: 2, name: labels[current], exact: true })).toBeVisible()
    if (labels[current] === 'Ubicación') await chooseMaterialLocation(page)
  }
  while (current > target) {
    await page.getByRole('button', { name: 'Paso anterior' }).click()
    current -= 1
    await expect(page.getByRole('heading', { level: 2, name: labels[current], exact: true })).toBeVisible()
  }
}

async function chooseMaterialLocation(page: import('@playwright/test').Page) {
  await page.getByRole('combobox', { name: 'Provincia' }).selectOption({ label: 'La Habana' })
  await page.getByRole('combobox', { name: 'Municipio' }).selectOption({ label: 'Playa' })
  const map = page.locator('.maplibregl-canvas')
  await expect(map).toBeVisible({ timeout: 15_000 })
  const bounds = await map.boundingBox()
  if (!bounds) throw new Error('El mapa de ubicación no tiene tamaño visible')
  await map.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } })
}

async function submitMaterial(page: import('@playwright/test').Page) {
  await materialStep(page, 'Contacto')
}

test('Materiales conserva varias fotos tras un fallo y permite reintentar sin duplicar el anuncio', async ({ page }) => {
  const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
  const listingId = '22222222-2222-4222-8222-222222222222'
  const uploads: Array<{ path: string; contentType: string; fileContentType: string; isWebP: boolean; size: number; status: number }> = []
  const cleanups: string[][] = []
  const updates: Array<Record<string, unknown>> = []
  let createCount = 0
  let createdPayload: Record<string, unknown> | null = null

  await mockDirectSupabaseReads(page)
  await page.route('**/api/material-photos/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const pathMatch = url.pathname.match(/\/api\/material-photos\/([^/]+)\/upload$/)
    const attempt = uploads.length + 1
    const failed = attempt === 2
    const body = request.postDataBuffer() ?? Buffer.alloc(0)
    const contentType = request.headers()['content-type'] ?? ''
    uploads.push({
      path: `${ownerId}/${pathMatch?.[1] ?? 'invalid'}/${String(attempt).padStart(8, '0')}-0000-4000-8000-000000000000.webp`,
      contentType,
      fileContentType: contentType,
      isWebP: body.subarray(0, 4).toString() === 'RIFF' && body.subarray(8, 12).toString() === 'WEBP',
      size: body.byteLength,
      status: failed ? 503 : 201,
    })
    await route.fulfill(failed
      ? { status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Photo upload unavailable' }) }
      : { status: 201, contentType: 'application/json', body: JSON.stringify({ path: uploads[attempt - 1]?.path }) })
  })
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

    if (url.pathname.endsWith('/rest/v1/material_listings') && request.method() === 'POST') {
      createCount += 1
      createdPayload = request.postDataJSON() as Record<string, unknown>
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: listingId }) })
      return
    }

    if (url.pathname.endsWith('/rest/v1/rpc/get_my_material_listings')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: listingId,
          slug: 'material-qa-con-varias-fotos',
          title: 'Material QA con varias fotos',
          category: 'cemento',
          description: 'Anuncio sintético E2E para validar la carga de varias fotos.',
          price: null,
          currency: 'USD',
          province: 'La Habana',
          availability: 'available',
          photo_urls: [],
          updated_at: '2026-11-14T12:00:00.000Z',
          status: 'pending_review',
          phone: null,
          whatsapp: null,
        }]),
      })
      return
    }

    if (url.pathname.endsWith('/rest/v1/rpc/update_material_listing')) {
      updates.push(request.postDataJSON() as Record<string, unknown>)
      await route.fulfill({ status: 204, body: '' })
      return
    }

    if (url.pathname.endsWith('/storage/v1/object/material-listings') && request.method() === 'DELETE') {
      const payload = request.postDataJSON() as { prefixes?: string[] }
      cleanups.push(payload.prefixes ?? [])
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
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
      user: { id: ownerId, email: 'qa@example.com', user_metadata: { full_name: 'QA local' } },
    }))
  }, ownerId)
  await page.goto('/publicar-material')

  await page.getByLabel('Nombre del producto').fill('Material QA con varias fotos')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Ubicación', exact: true })).toBeVisible()
  await chooseMaterialLocation(page)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Precio y detalles' })).toBeVisible()
  await page.getByLabel('Descripción').fill('Anuncio sintético E2E para validar la carga de varias fotos.')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Fotos' })).toBeVisible()
  await page.getByLabel('Fotos del producto').setInputFiles(['src/assets/hero.png', 'src/assets/hero.png'])
  await expect(page.getByText('Preparando tus fotos…')).toBeVisible()
  await expect(page.getByText('2 de 10 fotos. La primera será la portada del anuncio.')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Fotos del producto, foto 1' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Fotos del producto, foto 2' })).toBeVisible()

  await submitMaterial(page)
  const submitButton = page.getByRole('button', { name: /(?:Guardar y )?Enviar a revisión/ })
  await submitButton.click()
  await expect(page.getByRole('alert')).toHaveText(/El anuncio quedó guardado como pendiente, pero no se pudieron cargar las fotos/)
  await submitButton.click()
  await expect(page.getByRole('heading', { name: 'Anuncio enviado a revisión' })).toBeVisible()
  expect(createCount).toBe(1)
  expect(createdPayload).toMatchObject({ owner_id: ownerId, title: 'Material QA con varias fotos', photo_urls: [] })
  expect(updates).toHaveLength(1)
  expect(uploads.map(upload => upload.status)).toEqual([201, 503, 201, 201])
  expect(uploads.every(upload => upload.path.startsWith(`${ownerId}/${listingId}/`) && upload.path.endsWith('.webp'))).toBe(true)
  expect(uploads.every(upload => upload.contentType === 'image/webp'
    && upload.fileContentType === 'image/webp' && upload.isWebP && upload.size > 0), JSON.stringify(uploads)).toBe(true)
  expect(cleanups).toHaveLength(1)
  expect(cleanups[0]).toEqual([uploads[0]?.path])

  expect(createCount).toBe(1)
  expect(updates).toHaveLength(1)
  expect(updates[0]).toMatchObject({
    p_id: listingId,
    p_photo_urls: uploads.slice(2).map(upload => upload.path),
  })
})

test('Materiales guarda varios borradores locales y permite reanudar el guardado', async ({ page }) => {
  const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
  await page.route('**/api/supabase/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/v1/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: ownerId, email: 'qa@example.com', role: 'authenticated', aud: 'authenticated' }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  page.on('dialog', dialog => dialog.accept())
  await page.goto('/')
  await page.evaluate(userId => {
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'dummy-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'dummy-refresh', user: { id: userId, email: 'qa@example.com' },
    }))
  }, ownerId)

  await page.goto('/publicar-material')
  await page.getByLabel('Nombre del producto').fill('Cemento guardado')
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Borrador guardado' })).toBeVisible()
  await page.getByLabel('Nombre del producto').fill('Cambio no guardado')
  await page.getByRole('button', { name: 'Salir sin guardar' }).click()
  await page.goto('/mis-materiales')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByLabel('Nombre del producto')).toHaveValue('Cemento guardado')
  await page.getByRole('button', { name: 'Salir sin guardar' }).click()

  await page.goto('/publicar-material')
  await page.getByLabel('Nombre del producto').fill('Segundo borrador de material')
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Borrador guardado' })).toBeVisible()
  await page.goto('/mis-materiales')
  await expect(page.getByRole('heading', { name: 'Cemento guardado' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Segundo borrador de material' })).toBeVisible()
})

test('Materiales reutiliza el anuncio propio si se pierde la respuesta al crearlo', async ({ page }) => {
  const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const listingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const createRequests: Array<Record<string, unknown>> = []
  const updates: Array<Record<string, unknown>> = []
  let committedListing: Record<string, unknown> | null = null

  await mockDirectSupabaseReads(page)
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

    if (url.pathname.endsWith('/rest/v1/material_listings') && request.method() === 'POST') {
      const payload = request.postDataJSON() as Record<string, unknown>
      createRequests.push(payload)
      if (createRequests.length === 1) {
        committedListing = {
          id: listingId,
          slug: payload.slug,
          title: payload.title,
          category: payload.category,
          description: payload.description,
          price: payload.price,
          currency: payload.currency,
          province: payload.province,
          availability: payload.availability,
          phone: payload.phone,
          whatsapp: payload.whatsapp,
          photo_urls: [],
          status: 'pending_review',
          updated_at: '2026-11-15T12:00:00.000Z',
        }
        await route.abort('connectionreset')
        return
      }
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          code: '23505',
          details: 'Key (slug) already exists in material_listings_slug_key.',
          hint: null,
          message: 'duplicate key value violates unique constraint "material_listings_slug_key"',
        }),
      })
      return
    }

    if (url.pathname.endsWith('/rest/v1/rpc/get_my_material_listings')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(committedListing ? [committedListing] : []),
      })
      return
    }

    if (url.pathname.endsWith('/rest/v1/rpc/update_material_listing')) {
      updates.push(request.postDataJSON() as Record<string, unknown>)
      await route.fulfill({ status: 204, body: '' })
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
      user: { id: ownerId, email: 'qa@example.com', user_metadata: { full_name: 'QA local' } },
    }))
  }, ownerId)
  await page.goto('/publicar-material')
  await page.getByLabel('Nombre del producto').fill('Cemento para reparación QA')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await chooseMaterialLocation(page)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('Descripción').fill('Anuncio sintético para comprobar el reintento de creación.')

  await submitMaterial(page)
  const submitButton = page.getByRole('button', { name: /(?:Guardar y )?Enviar a revisión/ })
  await submitButton.click()
  await expect(page.getByRole('alert')).toHaveText(/No se pudo confirmar el guardado/)
  await submitButton.click()
  await expect(page.getByRole('heading', { name: 'Anuncio enviado a revisión' })).toBeVisible()
  const stableSlug = createRequests[0]?.slug
  expect(stableSlug).toMatch(/^cemento-para-reparacion-qa-[0-9a-f]{32}$/)

  expect(createRequests.length).toBeGreaterThanOrEqual(2)
  expect(createRequests.every(payload => payload.slug === stableSlug)).toBe(true)
  expect(updates).toContainEqual(expect.objectContaining({
    p_id: listingId,
    p_title: 'Cemento para reparación QA',
    p_photo_urls: [],
  }))
  expect(committedListing).toMatchObject({ id: listingId, status: 'pending_review' })
})

test('Materiales muestra las fotos privadas ya guardadas al editar el anuncio', async ({ page }) => {
  const ownerId = '11111111-1111-4111-8111-111111111111'
  const listingId = '22222222-2222-4222-8222-222222222222'
  const photoPath = `${ownerId}/${listingId}/33333333-3333-4333-8333-333333333333.webp`
  let signedPaths: string[] = []

  await mockDirectSupabaseReads(page)
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

    if (url.pathname.endsWith('/rest/v1/rpc/get_my_material_listings')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: listingId,
          slug: 'material-qa-foto-guardada',
          title: 'Material QA con foto guardada',
          category: 'cemento',
          description: 'Anuncio sintético para validar la vista previa privada al editar.',
          price: null,
          currency: 'USD',
          province: 'La Habana',
          availability: 'available',
          photo_urls: [photoPath],
          updated_at: '2026-11-14T12:00:00.000Z',
          status: 'pending_review',
          phone: null,
          whatsapp: null,
        }]),
      })
      return
    }

    if (url.pathname.endsWith('/storage/v1/object/sign/material-listings') && request.method() === 'POST') {
      signedPaths = (request.postDataJSON() as { paths?: string[] }).paths ?? []
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ path: photoPath, signedURL: `/object/sign/material-listings/${photoPath}?token=qa-synthetic` }]),
      })
      return
    }

    if (url.pathname.includes('/storage/v1/object/sign/material-listings/') && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lT8AAAAASUVORK5CYII=', 'base64'),
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
  await page.evaluate(({ ownerId }) => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'dummy-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
      refresh_token: 'dummy-refresh',
      user: { id: ownerId, email: 'qa@example.com', user_metadata: { full_name: 'QA local' } },
    }))
  }, { ownerId })
  await page.goto(`/publicar-material?edit=${listingId}`)

  await materialStep(page, 'Fotos')
  const image = page.getByRole('img', { name: 'Fotos del producto, foto 1' })
  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute('src', new RegExp(`${photoPath.replaceAll('-', '\\-')}`))
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(1)
  expect(signedPaths).toEqual([photoPath])
})

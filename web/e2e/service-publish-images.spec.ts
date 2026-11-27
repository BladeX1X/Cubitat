import { expect, test } from '@playwright/test'
import { mockDirectSupabaseReads } from './propertyFixtures'

async function serviceStep(page: import('@playwright/test').Page, label: string) {
  const labels = ['Servicio', 'Zona y mapa', 'Fotos', 'Contacto']
  const target = labels.indexOf(label)
  if (target < 0) throw new Error(`Paso desconocido: ${label}`)
  let current = labels.indexOf((await page.getByRole('heading', { level: 2 }).innerText()).trim())
  while (current < target) {
    await page.getByRole('button', { name: 'Continuar' }).click()
    current += 1
    await expect(page.getByRole('heading', { level: 2, name: labels[current], exact: true })).toBeVisible()
    if (labels[current] === 'Zona y mapa') await chooseServiceLocation(page)
  }
  while (current > target) {
    await page.getByRole('button', { name: 'Paso anterior' }).click()
    current -= 1
    await expect(page.getByRole('heading', { level: 2, name: labels[current], exact: true })).toBeVisible()
  }
}

async function chooseServiceLocation(page: import('@playwright/test').Page) {
  await page.getByRole('combobox', { name: 'Provincia' }).selectOption({ label: 'La Habana' })
  await page.getByRole('combobox', { name: 'Municipio' }).selectOption({ label: 'Playa' })
  const map = page.locator('.maplibregl-canvas')
  await expect(map).toBeVisible({ timeout: 15_000 })
  const bounds = await map.boundingBox()
  if (!bounds) throw new Error('El mapa de ubicación no tiene tamaño visible')
  await map.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } })
}

async function submitService(page: import('@playwright/test').Page) {
  await serviceStep(page, 'Contacto')
  await page.getByRole('button', { name: 'Enviar a revisión' }).click()
}

test('Servicios reintenta un guardado con respuesta perdida sin duplicar perfil ni subir fotos otra vez', async ({ page }) => {
  const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
  const uploads: string[] = []
  const insertPayloads: Array<Record<string, unknown>> = []
  const updates: Array<Record<string, unknown>> = []
  const cleanups: string[][] = []

  await mockDirectSupabaseReads(page)
  await page.route('**/api/supabase/**', async route => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        id: ownerId, email: 'qa@example.com', user_metadata: { full_name: 'QA local' }, role: 'authenticated', aud: 'authenticated',
      }) })
      return
    }

    if (url.pathname.endsWith('/rest/v1/home_service_providers') && request.method() === 'POST') {
      const payload = request.postDataJSON() as Record<string, unknown>
      insertPayloads.push(payload)
      if (insertPayloads.length === 1) {
        // Model the server committing the row while its response is lost.
        await route.abort('failed')
        return
      }
      await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({
        code: '23505', message: 'duplicate key value violates unique constraint "home_service_providers_pkey"',
      }) })
      return
    }

    if (url.pathname.endsWith('/rest/v1/rpc/update_home_service_provider')) {
      updates.push(request.postDataJSON() as Record<string, unknown>)
      await route.fulfill({ status: 204, body: '' })
      return
    }

    const storagePrefix = '/storage/v1/object/home-service-photos/'
    if (url.pathname.includes(storagePrefix) && request.method() === 'POST') {
      const path = decodeURIComponent(url.pathname.slice(url.pathname.indexOf(storagePrefix) + storagePrefix.length))
      uploads.push(path)
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: `home-service-photos/${path}` }) })
      return
    }

    if (url.pathname.endsWith('/storage/v1/object/home-service-photos') && request.method() === 'DELETE') {
      cleanups.push((request.postDataJSON() as { prefixes?: string[] }).prefixes ?? [])
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
  await page.goto('/publicar-servicio')

  await page.getByLabel('Nombre del profesional o negocio').fill('Electricista QA con galería')
  await page.getByLabel('Descripción').fill('Perfil de prueba para validar reintentos de publicación con varias fotos de trabajos.')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Zona y mapa', exact: true })).toBeVisible()
  await chooseServiceLocation(page)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Fotos' })).toBeVisible()
  await page.getByLabel('Fotos de tus trabajos').setInputFiles(['src/assets/hero.png', 'src/assets/hero.png'])
  await expect(page.getByText('2 de 10 fotos. La primera será la portada del anuncio.')).toBeVisible()

  await submitService(page)
  await expect(page.getByRole('heading', { name: 'Perfil enviado a revisión' })).toBeVisible()

  expect(uploads).toHaveLength(2)
  expect(uploads.every(path => path.startsWith(`${ownerId}/`) && path.endsWith('.webp'))).toBe(true)
  expect(insertPayloads.length).toBeGreaterThanOrEqual(2)
  expect(insertPayloads.every(payload => payload.id === insertPayloads[0]?.id)).toBe(true)
  expect(insertPayloads[0]?.gallery_urls).toEqual(uploads)
  expect(updates).toContainEqual(expect.objectContaining({ p_id: insertPayloads[0]?.id, p_gallery_urls: uploads }))
  expect(cleanups).toEqual([])
})

test('Servicios conserva múltiples borradores manuales y descarta solo cambios posteriores al guardar', async ({ page }) => {
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

  await page.goto('/publicar-servicio')
  await page.getByLabel('Nombre del profesional o negocio').fill('Servicio guardado')
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Borrador guardado' })).toBeVisible()
  await page.getByLabel('Nombre del profesional o negocio').fill('Cambio sin guardar')
  await page.getByRole('button', { name: 'Salir sin guardar' }).click()
  await page.goto('/mis-servicios')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByLabel('Nombre del profesional o negocio')).toHaveValue('Servicio guardado')
  await page.getByLabel('Nombre del profesional o negocio').fill('Otro cambio sin guardar')
  await page.getByRole('button', { name: 'Salir sin guardar' }).click()
  await page.goto('/mis-servicios')
  await expect(page.getByRole('heading', { name: 'Servicio guardado' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByLabel('Nombre del profesional o negocio')).toHaveValue('Servicio guardado')
  await page.getByRole('button', { name: 'Salir sin guardar' }).click()

  await page.goto('/publicar-servicio')
  await page.getByLabel('Nombre del profesional o negocio').fill('Segundo borrador de servicio')
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Borrador guardado' })).toBeVisible()
  await page.goto('/mis-servicios')
  await expect(page.getByRole('heading', { name: 'Servicio guardado' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Segundo borrador de servicio' })).toBeVisible()
})

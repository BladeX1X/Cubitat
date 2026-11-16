import { expect, test } from '@playwright/test'
import { mockDirectSupabaseReads } from './propertyFixtures'

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
  await page.getByLabel('Provincia').fill('La Habana')
  await page.getByLabel('Descripción').fill('Perfil de prueba para validar reintentos de publicación con varias fotos de trabajos.')
  await page.getByLabel('Fotos de tus trabajos').setInputFiles(['src/assets/hero.png', 'src/assets/hero.png'])
  await expect(page.getByText('2 de 10 fotos. La primera será la portada del anuncio.')).toBeVisible()

  await page.getByRole('button', { name: 'Enviar a revisión' }).click()
  await expect(page.getByRole('alert')).toContainText('No se pudo confirmar el guardado')

  // Removing a photo after the ambiguous result must not count its retained
  // upload path against the ten-photo limit when adding replacements.
  await page.getByRole('button', { name: 'Quitar foto 1' }).click()
  await page.locator('input[type="file"]').setInputFiles(Array.from({ length: 9 }, () => 'src/assets/hero.png'))
  await expect(page.getByText('Preparando tus fotos…')).toBeVisible()
  await expect(page.getByText('10 de 10 fotos. La primera será la portada del anuncio.')).toBeVisible()
  await page.getByRole('button', { name: 'Enviar a revisión' }).click()
  await expect(page.getByRole('heading', { name: 'Perfil enviado a revisión' })).toBeVisible()

  expect(uploads).toHaveLength(11)
  expect(uploads.every(path => path.startsWith(`${ownerId}/`) && path.endsWith('.webp'))).toBe(true)
  expect(insertPayloads).toHaveLength(2)
  expect(insertPayloads[0]?.id).toBe(insertPayloads[1]?.id)
  expect(insertPayloads[0]?.gallery_urls).toEqual(uploads.slice(0, 2))
  expect(insertPayloads[1]?.gallery_urls).toEqual([uploads[1], ...uploads.slice(2)])
  expect(updates).toHaveLength(1)
  expect(updates[0]).toMatchObject({ p_id: insertPayloads[0]?.id, p_gallery_urls: [uploads[1], ...uploads.slice(2)] })
  expect(cleanups).toEqual([[uploads[0]]])
})

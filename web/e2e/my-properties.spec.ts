import { expect, test } from '@playwright/test'
import { mockDirectSupabaseReads } from './propertyFixtures'

test('Mis publicaciones reintenta Storage temporal y muestra la portada privada', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  const ownerId = '11111111-1111-4111-8111-111111111111'
  const photoId = '22222222-2222-4222-8222-222222222222'
  let storageDownloads = 0
  let propertyWrites = 0

  await mockDirectSupabaseReads(page)
  await page.route('**/api/supabase/**', async route => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: ownerId,
          email: 'qa@example.com',
          user_metadata: { full_name: 'QA local' },
          role: 'authenticated',
          aud: 'authenticated',
        }),
      })
      return
    }

    if (url.pathname.includes('/storage/v1/object/property_images/')) {
      storageDownloads += 1
      if (storageDownloads === 1) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: '503', error: 'Service Unavailable', message: 'temporary storage error' }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'image/webp',
        body: Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64'),
      })
      return
    }

    if (url.pathname.endsWith('/rest/v1/properties')) {
      if (request.method() !== 'GET') propertyWrites += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'qa-private-cover',
            title: 'Casa publicada QA',
            location: 'Playa, La Habana',
            price_usd: 68000,
            cover_image: `${new URL(request.url()).origin}/api/supabase/storage/v1/object/public/property_images/${ownerId}/${photoId}.webp`,
            status: 'published',
            moderation_message: null,
            created_at: '2026-11-13T12:00:00.000Z',
            user_id: ownerId,
            view_count: 0,
          },
          {
            id: 'qa-pending', title: 'Casa en revisión QA', location: 'La Habana', price_usd: 100,
            cover_image: null, status: 'pending_review', moderation_message: null,
            created_at: '2026-11-13T12:00:00.000Z', user_id: ownerId,
          },
          {
            id: 'qa-rejected', title: 'Casa rechazada QA', location: 'Matanzas', price_usd: 100,
            cover_image: null, status: 'ai_rejected', moderation_message: 'Motivo de rechazo de prueba',
            created_at: '2026-11-13T12:00:00.000Z', user_id: ownerId,
          },
          {
            id: 'qa-draft', title: 'Casa borrador QA', location: 'Cuba', price_usd: 0,
            cover_image: null, status: 'draft', moderation_message: null,
            created_at: '2026-11-13T12:00:00.000Z', user_id: ownerId,
          },
        ]),
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
      access_token: 'dummy-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: 'dummy-refresh',
      user: { id: ownerId, email: 'qa@example.com', user_metadata: { full_name: 'QA local' } },
    }))
  }, ownerId)
  await page.goto('/mis-propiedades')

  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBe(0)

  const cover = page.getByRole('img', { name: 'Casa publicada QA' })
  await expect(cover).toBeVisible()
  await expect.poll(() => cover.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(cover).toHaveAttribute('src', /^blob:/)
  await expect(page.getByText('Sin imagen')).toHaveCount(0)

  const filters = page.getByRole('group', { name: 'Filtrar publicaciones por estado' })
  await filters.getByRole('button', { name: /En revisión/ }).click()
  await expect(page.getByRole('heading', { name: 'Casa en revisión QA' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Casa publicada QA' })).toHaveCount(0)

  await filters.getByRole('button', { name: /Rechazadas/ }).click()
  await expect(page.getByRole('heading', { name: 'Casa rechazada QA' })).toBeVisible()
  await expect(page.getByText('Motivo de rechazo de prueba')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Casa en revisión QA' })).toHaveCount(0)

  await filters.getByRole('button', { name: /Borradores/ }).click()
  await expect(page.getByRole('heading', { name: 'Casa borrador QA' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Casa rechazada QA' })).toHaveCount(0)

  await filters.getByRole('button', { name: /Todas/ }).click()
  await expect(page.getByRole('heading', { name: 'Casa publicada QA' })).toBeVisible()
  expect(storageDownloads).toBe(2)
  expect(propertyWrites).toBe(0)
})

test('si falla eliminar una publicación, la conserva y explica el error', async ({ page }) => {
  const ownerId = '11111111-1111-4111-8111-111111111111'
  const propertyId = '22222222-2222-4222-8222-222222222222'
  let deleteRequests = 0

  await mockDirectSupabaseReads(page)
  await page.route('**/api/supabase/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: ownerId, email: 'qa@example.com', user_metadata: { full_name: 'QA' }, role: 'authenticated', aud: 'authenticated' }) })
      return
    }
    if (url.pathname.endsWith('/rest/v1/properties') && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: propertyId, title: 'Casa de prueba para eliminar', location: 'La Habana', price_usd: 50000,
          cover_image: null, status: 'published', moderation_message: null, created_at: '2026-11-14T12:00:00.000Z',
          user_id: ownerId, view_count: 0,
        }]),
      })
      return
    }
    if (url.pathname.endsWith('/rest/v1/properties') && request.method() === 'DELETE') {
      deleteRequests += 1
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: '42501', message: 'permission denied' }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.goto('/')
  await page.evaluate(ownerId => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'dummy-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
      refresh_token: 'dummy-refresh', user: { id: ownerId, email: 'qa@example.com', user_metadata: { full_name: 'QA' } },
    }))
  }, ownerId)
  await page.goto('/mis-propiedades')
  await expect(page.getByRole('heading', { name: 'Casa de prueba para eliminar' })).toBeVisible()
  page.on('dialog', dialog => dialog.accept())

  await page.getByRole('button', { name: 'Eliminar' }).click()

  await expect(page.getByRole('heading', { name: 'Casa de prueba para eliminar' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText(/no se pudo eliminar/i)
  expect(deleteRequests).toBe(1)
})

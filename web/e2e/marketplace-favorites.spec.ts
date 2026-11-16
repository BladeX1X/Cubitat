import { expect, test } from '@playwright/test'

const ownerId = '55555555-5555-4555-8555-555555555555'

const service = {
  id: '66666666-6666-4666-8666-666666666666',
  slug: 'fontanero-favorito-qa',
  display_name: 'Fontanero favorito QA',
  category: 'plomeria',
  description: 'Servicio sintético para probar favoritos.',
  province: 'La Habana',
  municipalities: ['Playa'],
  gallery_urls: [],
  updated_at: '2026-11-14T12:00:00.000Z',
  status: 'published',
}

const material = {
  id: '77777777-7777-4777-8777-777777777777',
  slug: 'cemento-favorito-qa',
  title: 'Cemento favorito QA',
  category: 'cemento',
  description: 'Material sintético para probar favoritos.',
  price: 12,
  currency: 'USD',
  province: 'La Habana',
  availability: 'available',
  photo_urls: [],
  updated_at: '2026-11-14T12:00:00.000Z',
  status: 'published',
}

async function prepareMarketplaceFavorites(page: import('@playwright/test').Page, authenticated = true) {
  const savedRows: Array<{ user_id: string; service_provider_id: string | null; material_listing_id: string | null }> = []
  if (authenticated) {
    await page.addInitScript((userId) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
        access_token: 'qa-marketplace-favorites-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expiresAt,
        refresh_token: 'qa-marketplace-favorites-refresh',
        user: { id: userId, email: 'marketplace-favorites-qa@example.com' },
      }))
    }, ownerId)
  }

  await page.route('**/api/supabase/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname.replace('/api/supabase', '')

    if (pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({
        status: authenticated ? 200 : 401,
        contentType: 'application/json',
        body: authenticated ? JSON.stringify({
          id: ownerId,
          email: 'marketplace-favorites-qa@example.com',
          role: 'authenticated',
          aud: 'authenticated',
        }) : JSON.stringify({ message: 'Auth session missing' }),
      })
      return
    }

    if (pathname.endsWith('/rest/v1/saved_marketplace_listings')) {
      if (request.method() === 'POST') {
        const payload = request.postDataJSON() as typeof savedRows[number]
        savedRows.push(payload)
        await route.fulfill({ status: 201, contentType: 'application/json', body: '' })
        return
      }
      if (request.method() === 'DELETE') {
        const serviceId = url.searchParams.get('service_provider_id')?.replace(/^eq\./, '')
        const materialId = url.searchParams.get('material_listing_id')?.replace(/^eq\./, '')
        const index = savedRows.findIndex(row => serviceId
          ? row.user_id === ownerId && row.service_provider_id === serviceId
          : row.user_id === ownerId && row.material_listing_id === materialId)
        if (index >= 0) savedRows.splice(index, 1)
        await route.fulfill({ status: 204, body: '' })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(savedRows.filter(row => row.user_id === ownerId)),
      })
      return
    }

    if (pathname.endsWith('/rest/v1/home_service_providers')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: JSON.stringify([service]),
      })
      return
    }

    if (pathname.endsWith('/rest/v1/material_listings')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: JSON.stringify([material]),
      })
      return
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  return savedRows
}

for (const listing of [
  { type: 'service', path: '/servicios', title: service.display_name, id: service.id, column: 'service_provider_id' },
  { type: 'material', path: '/materiales', title: material.title, id: material.id, column: 'material_listing_id' },
] as const) {
  test(`${listing.type === 'service' ? 'Servicios' : 'Materiales'} guarda, muestra y permite quitar el favorito`, async ({ page }) => {
    const savedRows = await prepareMarketplaceFavorites(page)

    await page.goto(listing.path)
    await expect(page.getByRole('heading', { name: listing.title })).toBeVisible()
    const saveButton = page.getByRole('button', { name: `Guardar ${listing.title} en favoritos` })
    await expect(saveButton).toHaveAttribute('aria-pressed', 'false')
    await saveButton.click()
    const removeButton = page.getByRole('button', { name: `Quitar ${listing.title} de favoritos` })
    await expect(removeButton).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => savedRows.length).toBe(1)
    expect(savedRows[0]).toMatchObject({
      user_id: ownerId,
      service_provider_id: listing.column === 'service_provider_id' ? listing.id : null,
      material_listing_id: listing.column === 'material_listing_id' ? listing.id : null,
    })

    await page.goto('/favoritos')
    await expect(page.getByRole('heading', { name: listing.title })).toBeVisible()
    await page.getByRole('button', { name: `Quitar ${listing.title} de favoritos` }).click()
    await expect(page.getByText('Todavía no tienes favoritos')).toBeVisible()
    await expect.poll(() => savedRows.length).toBe(0)
  })

  test(`una visita sin sesión recibe el acceso a Favoritos al guardar ${listing.type === 'service' ? 'el servicio' : 'el material'}`, async ({ page }) => {
    const savedRows = await prepareMarketplaceFavorites(page, false)

    await page.goto(listing.path)
    await expect(page.getByRole('heading', { name: listing.title })).toBeVisible()
    await page.getByRole('button', { name: `Guardar ${listing.title} en favoritos` }).click()

    const savePrompt = page.getByRole('dialog', { name: 'Guardar favorito' })
    await expect(savePrompt).toBeVisible()
    await expect(savePrompt).toContainText('Inicia sesión para guardar tus favoritos')
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(savedRows).toHaveLength(0)
  })
}

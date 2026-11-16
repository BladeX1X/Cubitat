import { expect, test, type Page } from '@playwright/test'

const ownerId = '88888888-8888-4888-8888-888888888888'

const serviceRows = [
  { id: 'service-pending', display_name: 'Servicio en revisión QA', status: 'pending_review' },
  { id: 'service-published', display_name: 'Servicio publicado QA', status: 'published' },
  { id: 'service-paused', display_name: 'Servicio pausado QA', status: 'paused' },
  { id: 'service-rejected', display_name: 'Servicio con cambios QA', status: 'rejected' },
].map(row => ({
  slug: row.id,
  category: 'plomeria',
  description: 'Perfil sintético para revisar estados del propietario.',
  province: 'La Habana',
  municipalities: ['Playa'],
  gallery_urls: [],
  updated_at: '2026-11-14T12:00:00.000Z',
  phone: null,
  whatsapp: null,
  ...row,
}))

const materialRows = [
  { id: 'material-pending', title: 'Material en revisión QA', status: 'pending_review' },
  { id: 'material-published', title: 'Material publicado QA', status: 'published' },
  { id: 'material-paused', title: 'Material pausado QA', status: 'paused' },
  { id: 'material-rejected', title: 'Material rechazado QA', status: 'rejected' },
  { id: 'material-archived', title: 'Material archivado QA', status: 'archived' },
].map(row => ({
  slug: row.id,
  category: 'cemento',
  description: 'Anuncio sintético para revisar estados del propietario.',
  province: 'La Habana',
  price: 12,
  currency: 'USD',
  availability: 'available',
  photo_urls: [],
  updated_at: '2026-11-14T12:00:00.000Z',
  phone: null,
  whatsapp: null,
  ...row,
}))

async function installOwnerSession(page: Page) {
  await page.addInitScript((userId) => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'qa-owner-listings-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: 'qa-owner-listings-refresh',
      user: { id: userId, email: 'owner-listings-qa@example.com' },
    }))
  }, ownerId)
}

async function mockOwnerListingApi(page: Page, failure?: (rpc: 'services' | 'materials', attempt: number) => boolean) {
  const attempts = new Map<string, number>()
  await page.route('**/api/supabase/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname.replace('/api/supabase', '')

    if (pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: ownerId, email: 'owner-listings-qa@example.com', role: 'authenticated', aud: 'authenticated' }),
      })
      return
    }

    if (pathname.endsWith('/rest/v1/rpc/get_my_home_service_providers')) {
      const attempt = (attempts.get('services') ?? 0) + 1
      attempts.set('services', attempt)
      if (failure?.('services', attempt)) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'temporary QA failure' }) })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(serviceRows) })
      return
    }

    if (pathname.endsWith('/rest/v1/rpc/get_my_material_listings')) {
      const attempt = (attempts.get('materials') ?? 0) + 1
      attempts.set('materials', attempt)
      if (failure?.('materials', attempt)) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'temporary QA failure' }) })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(materialRows) })
      return
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  return attempts
}

test('Mis perfiles muestra los estados y permite editar solo perfiles no publicados', async ({ page }) => {
  await installOwnerSession(page)
  await mockOwnerListingApi(page)
  await page.goto('/mis-servicios')

  const profiles = page.getByRole('main')
  await expect(profiles.getByRole('heading', { name: 'Servicio en revisión QA' })).toBeVisible()
  await expect(profiles.getByRole('heading', { name: 'Servicio publicado QA' }).locator('..')).toBeVisible()
  await expect(profiles.getByText('En revisión', { exact: true })).toBeVisible()
  await expect(profiles.getByText('Publicado', { exact: true })).toBeVisible()
  await expect(profiles.getByText('Pausado por moderación', { exact: true })).toBeVisible()
  await expect(profiles.getByText('Requiere cambios', { exact: true })).toBeVisible()

  const published = profiles.locator('article').filter({ hasText: 'Servicio publicado QA' })
  await expect(published.getByRole('button', { name: 'Editar' })).toHaveCount(0)
  const editable = profiles.locator('article').filter({ hasText: /Servicio (en revisión|pausado|con cambios) QA/ })
  await expect(editable).toHaveCount(3)
  await expect(editable.getByRole('button', { name: 'Editar' })).toHaveCount(3)
})

test('Mis anuncios respeta los estados y bloquea la edición de un material archivado', async ({ page }) => {
  await installOwnerSession(page)
  await mockOwnerListingApi(page)
  await page.goto('/mis-materiales')

  const listings = page.getByRole('region', { name: 'Tus anuncios' })
  for (const [title, label] of [
    ['Material en revisión QA', 'En revisión'],
    ['Material publicado QA', 'Publicado'],
    ['Material pausado QA', 'Pausado'],
    ['Material rechazado QA', 'Rechazado'],
    ['Material archivado QA', 'Archivado'],
  ]) {
    const card = listings.locator('article').filter({ hasText: title })
    await expect(card).toContainText(label)
  }
  await expect(listings.locator('article').filter({ hasText: 'Material publicado QA' }).getByRole('button', { name: 'Editar' })).toBeEnabled()
  await expect(listings.locator('article').filter({ hasText: 'Material archivado QA' }).getByRole('button', { name: 'Editar' })).toBeDisabled()
})

test('Mis perfiles permite reintentar cuando falla la lectura y no presenta una lista vacía', async ({ page }) => {
  await installOwnerSession(page)
  const attempts = await mockOwnerListingApi(page, (rpc, attempt) => rpc === 'services' && attempt === 1)
  await page.goto('/mis-servicios')

  const error = page.getByRole('alert')
  await expect(error).toContainText('No se pudieron cargar tus perfiles.')
  await expect(page.getByText('Todavía no tienes perfiles')).toHaveCount(0)
  await error.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('heading', { name: 'Servicio en revisión QA' })).toBeVisible()
  // React StrictMode may trigger an extra initial read in the development server.
  expect(attempts.get('services')).toBeGreaterThan(1)
})

test('Mis anuncios permite reintentar la carga después de un error temporal', async ({ page }) => {
  await installOwnerSession(page)
  const attempts = await mockOwnerListingApi(page, (rpc, attempt) => rpc === 'materials' && attempt === 1)
  await page.goto('/mis-materiales')

  await expect(page.getByRole('alert')).toContainText('No se pudieron cargar tus anuncios.')
  await expect(page.getByText('Todavía no has publicado materiales')).toHaveCount(0)
  await page.getByRole('button', { name: 'Actualizar' }).click()
  await expect(page.getByRole('heading', { name: 'Material en revisión QA' })).toBeVisible()
  // React StrictMode may trigger an extra initial read in the development server.
  expect(attempts.get('materials')).toBeGreaterThan(1)
})

test('Mis anuncios conserva los resultados si falla una actualización posterior', async ({ page }) => {
  await installOwnerSession(page)
  let failRefresh = false
  await mockOwnerListingApi(page, (rpc) => rpc === 'materials' && failRefresh)
  await page.goto('/mis-materiales')

  const listings = page.getByRole('region', { name: 'Tus anuncios' })
  await expect(listings.getByRole('heading', { name: 'Material en revisión QA' })).toBeVisible()
  failRefresh = true
  await page.getByRole('button', { name: 'Actualizar' }).click()

  await expect(page.getByRole('alert')).toContainText('No se pudieron cargar tus anuncios.')
  await expect(listings.getByRole('heading', { name: 'Material en revisión QA' })).toBeVisible()
  await expect(page.getByText('Todavía no has publicado materiales')).toHaveCount(0)
})

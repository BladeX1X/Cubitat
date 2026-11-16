import { expect, test } from '@playwright/test'

const service = {
  id: 'b46e8c38-9a0d-4d62-98f8-9ea140100001',
  slug: 'qa-perfil-plomeria',
  display_name: 'Perfil QA de plomería',
  category: 'plomeria',
  description: 'Servicio sintético de QA para verificar la carga de detalles.',
  province: 'La Habana',
  municipalities: ['Playa'],
  gallery_urls: [],
  updated_at: '2026-11-15T12:00:00.000Z',
}

const material = {
  id: 'b46e8c38-9a0d-4d62-98f8-9ea140100002',
  slug: 'qa-cemento-gris',
  title: 'Material QA de cemento',
  category: 'cemento',
  description: 'Material sintético de QA para verificar la carga de detalles.',
  price: 10,
  currency: 'USD',
  province: 'La Habana',
  availability: 'available',
  photo_urls: [],
  updated_at: '2026-11-15T12:00:00.000Z',
}

async function delay(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function observeDetailStates(page: import('@playwright/test').Page) {
  const states: string[] = []
  await page.exposeFunction('recordCatalogDetailState', (state: string) => states.push(state))
  await page.evaluate(() => {
    const record = (window as Window & { recordCatalogDetailState: (state: string) => void }).recordCatalogDetailState
    const capture = () => {
      const heading = document.querySelector('main h1')?.textContent?.trim()
      const status = document.querySelector('main [role="status"]')?.textContent?.trim()
      const state = heading || status
      if (state) record(state)
    }
    new MutationObserver(capture).observe(document.body, { childList: true, subtree: true, characterData: true })
    capture()
  })
  return states
}

test('Servicios keeps a loading state while opening a detail after the directory has loaded', async ({ page }) => {
  let detailRequestStarted = false
  await page.route('**/*home_service_providers*', async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.has('slug')) {
      detailRequestStarted = true
      await delay(900)
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([service]) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/1' },
      body: JSON.stringify([service]),
    })
  })

  await page.goto('/servicios')
  // The DEV-sized app bundle can be under CPU pressure when the full suite is
  // running in parallel; wait for the catalog data instead of treating a
  // slow first render as a broken detail route.
  await expect(page.getByText(service.display_name)).toBeVisible({ timeout: 15_000 })
  const states = await observeDetailStates(page)
  await page.locator('article button').first().click()
  await expect(page).toHaveURL(/\/servicios\/qa-perfil-plomeria$/)
  expect(detailRequestStarted).toBe(true)
  await expect(page.getByRole('main', { name: 'Cargando ficha de servicio' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Servicio no disponible' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: service.display_name })).toBeVisible()
  expect(states).toContain('Cargando perfil…')
  expect(states).not.toContain('Servicio no disponible')

  await page.goBack()
  await expect(page).toHaveURL(/\/servicios$/)
  await expect(page.getByRole('heading', { name: 'Servicios para el hogar' })).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL(/\/servicios\/qa-perfil-plomeria$/)
  await expect(page.getByRole('main', { name: 'Cargando ficha de servicio' })).toBeVisible()
  await expect(page.getByRole('heading', { name: service.display_name })).toBeVisible()
  expect(states).not.toContain('Servicio no disponible')
})

test('Materiales keeps a loading state while opening a detail after the catalog has loaded', async ({ page }) => {
  let detailRequestStarted = false
  await page.route('**/*material_listings*', async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.has('slug')) {
      detailRequestStarted = true
      await delay(900)
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([material]) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/1' },
      body: JSON.stringify([material]),
    })
  })

  await page.goto('/materiales')
  await expect(page.getByText(material.title)).toBeVisible({ timeout: 15_000 })
  const states = await observeDetailStates(page)
  await page.locator('article button').first().click()
  await expect(page).toHaveURL(/\/materiales\/qa-cemento-gris$/)
  expect(detailRequestStarted).toBe(true)
  await expect(page.getByRole('main', { name: 'Cargando anuncio' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Anuncio no disponible' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: material.title })).toBeVisible()
  expect(states).toContain('Cargando anuncio…')
  expect(states).not.toContain('Anuncio no disponible')

  await page.goBack()
  await expect(page).toHaveURL(/\/materiales$/)
  await expect(page.getByRole('heading', { name: 'Materiales de construcción' })).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL(/\/materiales\/qa-cemento-gris$/)
  await expect(page.getByRole('main', { name: 'Cargando anuncio' })).toBeVisible()
  await expect(page.getByRole('heading', { name: material.title })).toBeVisible()
  expect(states).not.toContain('Anuncio no disponible')
})

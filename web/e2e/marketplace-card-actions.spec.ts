import { expect, test, type Page } from '@playwright/test'

const serviceRow = {
  id: 'qa-provider-1', slug: 'fontanero-qa', display_name: 'Fontanero QA', category: 'plomeria',
  description: 'Reparación de tuberías y grifería para pruebas.', province: 'La Habana',
  municipalities: ['Playa'], gallery_urls: [], updated_at: '2026-11-13T12:00:00.000Z',
}
const materialRow = {
  id: 'qa-material-1', slug: 'cemento-qa', title: 'Cemento QA', category: 'cemento',
  description: 'Material de prueba para reparaciones.', price: 12, currency: 'USD',
  province: 'La Habana', availability: 'available', photo_urls: [], updated_at: '2026-11-13T12:00:00.000Z',
}

type ContactFixture = { phone: string | null; whatsapp: string | null }
type UserFixture = { id: string; email: string; user_metadata: { full_name: string }; role: string; aud: string }

async function mockCatalogApi(page: Page, options: {
  contact?: ContactFixture
  user?: UserFixture | null
  onInquiry?: (path: string, body: unknown) => void
} = {}) {
  await page.route('**/api/supabase/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const isDetail = url.searchParams.has('slug')
    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(options.user ?? {}) })
    } else if (request.method() === 'POST' && (url.pathname.endsWith('/home_service_inquiries') || url.pathname.endsWith('/material_inquiries'))) {
      options.onInquiry?.(url.pathname, request.postDataJSON())
      await route.fulfill({ status: 201, contentType: 'application/json', body: '' })
    } else if (url.pathname.endsWith('/home_service_providers')) {
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify(isDetail ? serviceRow : [serviceRow]) })
    } else if (url.pathname.endsWith('/material_listings')) {
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify(isDetail ? materialRow : [materialRow]) })
    } else if (url.pathname.includes('/auth/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
  })
  await page.route('**/api/public/marketplace-contact', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(options.contact ?? { phone: '+5351234567', whatsapp: '+5355510101' }),
  }))
  await page.route('https://wa.me/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp mock</title>' }))
}

async function installAuthSession(page: Page, user: UserFixture) {
  await page.addInitScript(sessionUser => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'qa-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
      refresh_token: 'qa-refresh', user: sessionUser,
    }))
  }, user)
}

for (const catalog of [
  { name: 'Servicios', path: '/servicios', heading: 'Fontanero QA', detail: '/servicios/fontanero-qa', listingType: 'service' },
  { name: 'Materiales', path: '/materiales', heading: 'Cemento QA', detail: '/materiales/cemento-qa', listingType: 'material' },
]) {
  test.describe(`acciones directas de ${catalog.name}`, () => {
    test('Contactar solicita el teléfono y conserva el catálogo actual', async ({ page }) => {
      await mockCatalogApi(page)
      let requestedContact: unknown
      await page.route('**/api/public/marketplace-contact', async route => {
        requestedContact = route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ phone: '+5351234567', whatsapp: '+5355510101' }),
        })
      })
      await page.goto(catalog.path)
      await expect(page.getByRole('heading', { name: catalog.heading })).toBeVisible()

      const timeOrigin = await page.evaluate(() => performance.timeOrigin)
      const popupPromise = page.waitForEvent('popup', { timeout: 500 }).catch(() => null)
      await page.getByRole('button', { name: 'Contactar' }).click()
      await expect.poll(() => requestedContact).toEqual({ listing_type: catalog.listingType, listing_id: catalog.listingType === 'service' ? serviceRow.id : materialRow.id })

      expect(await popupPromise).toBeNull()
      await expect(page).toHaveURL(new RegExp(`${catalog.path}$`))
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin)
    })

    test('Consultar abre WhatsApp contextual sin recargar ni cambiar la ficha actual', async ({ page }) => {
      await mockCatalogApi(page)
      await page.goto(catalog.path)
      await expect(page.getByRole('heading', { name: catalog.heading })).toBeVisible()

      const timeOrigin = await page.evaluate(() => performance.timeOrigin)
      const popupPromise = page.waitForEvent('popup')
      await page.getByRole('button', { name: 'Consultar' }).click()
      const popup = await popupPromise
      await expect(popup).toHaveURL(/https:\/\/api\.whatsapp\.com\/send/)
      expect(new URL(popup.url()).searchParams.get('phone')).toBe('5355510101')
      expect(new URL(popup.url()).searchParams.get('text')).toContain(catalog.heading)
      await expect(page).toHaveURL(new RegExp(`${catalog.path}$`))
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin)
    })

    test('no inventa WhatsApp a partir del teléfono y ofrece el formulario', async ({ page }) => {
      await mockCatalogApi(page)
      await page.route('**/api/public/marketplace-contact', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ phone: '+5351234567', whatsapp: null }) }))
      await page.goto(catalog.path)
      await expect(page.getByRole('heading', { name: catalog.heading })).toBeVisible()

      await page.getByRole('button', { name: 'Consultar' }).click()
      await expect(page.getByText(/no ha asociado WhatsApp a este anuncio/i)).toHaveAttribute('role', 'status')
      await page.getByRole('button', { name: /Abrir anuncio y enviar una consulta/ }).click()
      await expect(page).toHaveURL(new RegExp(`${catalog.detail}$`))
      await expect(page.getByLabel(catalog.listingType === 'service' ? 'Mensaje para el profesional' : 'Enviar consulta al vendedor')).toBeFocused()
    })

    test('conserva el mensaje y solicita iniciar sesión antes de enviar', async ({ page }) => {
      await mockCatalogApi(page, { contact: { phone: '+5351234567', whatsapp: null }, user: null })
      await page.goto(catalog.path)
      await expect(page.getByRole('heading', { name: catalog.heading })).toBeVisible()
      await page.getByRole('button', { name: 'Consultar' }).click()
      await page.getByRole('button', { name: /Abrir anuncio y enviar una consulta/ }).click()

      const inquiry = page.getByLabel(catalog.listingType === 'service' ? 'Mensaje para el profesional' : 'Enviar consulta al vendedor')
      const message = 'Quisiera consultar la disponibilidad y recibir más detalles del anuncio.'
      await inquiry.fill(message)
      await page.getByRole('button', { name: 'Enviar consulta' }).click()

      await expect(page.getByRole('dialog', { name: /inicio de sesion/i })).toBeVisible()
      await expect(inquiry).toHaveValue(message)
      await expect(page.getByText(/inicia sesión y vuelve a intentarlo/i)).toBeVisible()
    })

    test('envía la consulta autenticada, confirma el resultado y limpia el mensaje', async ({ page }) => {
      const user: UserFixture = {
        id: 'qa-inquiry-user', email: 'qa@example.com', user_metadata: { full_name: 'QA' }, role: 'authenticated', aud: 'authenticated',
      }
      let submittedInquiry: { path: string; body: unknown } | undefined
      await installAuthSession(page, user)
      await mockCatalogApi(page, {
        user,
        onInquiry: (path, body) => { submittedInquiry = { path, body } },
      })
      await page.goto(`${catalog.path}/${catalog.listingType === 'service' ? serviceRow.slug : materialRow.slug}`)
      const inquiry = page.getByLabel(catalog.listingType === 'service' ? 'Mensaje para el profesional' : 'Enviar consulta al vendedor')
      await inquiry.fill('Quisiera consultar la disponibilidad y recibir más detalles del anuncio.')
      await page.getByRole('button', { name: 'Enviar consulta' }).click()

      await expect(page.getByText(/consulta enviada/i)).toHaveAttribute('role', 'status')
      await expect(inquiry).toHaveValue('')
      expect(submittedInquiry).toEqual({
        path: catalog.listingType === 'service' ? '/api/supabase/rest/v1/home_service_inquiries' : '/api/supabase/rest/v1/material_inquiries',
        body: expect.objectContaining({
          sender_id: user.id,
          ...(catalog.listingType === 'service' ? { provider_id: serviceRow.id } : { listing_id: materialRow.id }),
          message: 'Quisiera consultar la disponibilidad y recibir más detalles del anuncio.',
        }),
      })
    })
  })
}

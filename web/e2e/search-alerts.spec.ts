import { expect, test } from '@playwright/test'

const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'

async function installAlertApiMocks(page: import('@playwright/test').Page) {
  const alerts: Array<Record<string, unknown>> = []
  const deletedAlertIds: string[] = []

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
          user_metadata: { full_name: 'Cuenta QA' },
          role: 'authenticated',
          aud: 'authenticated',
        }),
      })
      return
    }

    if (url.pathname.endsWith('/auth/v1/token')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'qa-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'qa-refresh-token',
          user: {
            id: ownerId,
            email: 'qa@example.com',
            user_metadata: { full_name: 'Cuenta QA' },
            role: 'authenticated',
            aud: 'authenticated',
          },
        }),
      })
      return
    }

    if (url.pathname.endsWith('/rest/v1/search_alerts')) {
      if (request.method() === 'POST') {
        const payload = request.postDataJSON() as Record<string, unknown>
        const now = new Date().toISOString()
        const alert = {
          id: 'qa-search-alert-1',
          ...payload,
          is_active: true,
          last_sent_at: null,
          created_at: now,
          updated_at: now,
        }
        alerts.unshift(alert)
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(alert) })
        return
      }

      if (request.method() === 'DELETE') {
        const alertId = url.searchParams.get('id')?.replace(/^eq\./, '')
        if (alertId) deletedAlertIds.push(alertId)
        for (let index = alerts.length - 1; index >= 0; index -= 1) {
          if (alerts[index]?.id === alertId) alerts.splice(index, 1)
        }
        await route.fulfill({ status: 204, body: '' })
        return
      }

      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(alerts) })
      return
    }

    if (url.pathname.includes('/rest/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  return { alerts, deletedAlertIds }
}

async function mockTurnstile(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.turnstile = {
      render: (_container, options) => {
        window.setTimeout(() => options.callback('qa-turnstile-token'), 0)
        return 'qa-widget'
      },
      remove: () => undefined,
      getResponse: () => 'qa-turnstile-token',
    }
  })
}

test('crear alerta desde resultados, verla en Mi cuenta y eliminarla', async ({ page }) => {
  const { alerts, deletedAlertIds } = await installAlertApiMocks(page)

  await page.goto('/')
  await page.evaluate(owner => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: 'dummy-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: 'dummy-refresh',
      user: { id: owner, email: 'qa@example.com', user_metadata: { full_name: 'Cuenta QA' } },
    }))
  }, ownerId)

  await page.goto('/resultados?q=Vedado&operacion=venta&tipo=apartamento')
  const createAlert = page.getByRole('button', { name: 'Crear alerta' }).first()
  await expect(createAlert).toBeVisible()
  await createAlert.click()

  const successDialog = page.getByRole('dialog', { name: 'Alerta de búsqueda creada' })
  await expect(successDialog).toBeVisible()
  await expect(successDialog).toContainText('Ubicación: Vedado')
  await expect(successDialog).toContainText('Operación: Venta')
  await expect(successDialog).toContainText('Tipo: Departamentos')
  expect(alerts).toHaveLength(1)
  expect(alerts[0]).toMatchObject({ user_id: ownerId, query: 'Vedado', operation: 'venta', property_type: 'apartamento' })

  await successDialog.getByRole('button', { name: 'Ver en Mi cuenta' }).click()
  await expect(page).toHaveURL(/mi-cuenta/)
  const createdAlert = page.locator('[data-search-alert-id="qa-search-alert-1"]')
  await expect(createdAlert).toBeVisible()
  await expect(createdAlert).toContainText('Apartamentos en venta en Vedado')

  await createdAlert.getByRole('button', { name: 'Eliminar' }).click()
  await expect(createdAlert).toHaveCount(0)
  await expect(page.getByText('Alerta eliminada.')).toBeVisible()
  expect(alerts).toHaveLength(0)
  expect(deletedAlertIds).toEqual(['qa-search-alert-1'])
})

test('conserva los filtros de un visitante y crea el alerta al iniciar sesión', async ({ page }) => {
  const { alerts } = await installAlertApiMocks(page)
  await mockTurnstile(page)

  await page.goto('/resultados?q=Vedado&operacion=venta&tipo=apartamento')
  await page.getByRole('button', { name: 'Crear alerta' }).first().click()

  const pendingAlert = JSON.parse(await page.evaluate(() =>
    window.localStorage.getItem('cubitat-pending-search-alert'),
  ) ?? 'null') as { query: string; operations: string[]; propertyType: string }
  expect(pendingAlert).toMatchObject({ query: 'Vedado', operations: ['venta'], propertyType: 'apartamento' })

  const loginDialog = page.getByRole('dialog', { name: 'Inicio de sesion' })
  await expect(loginDialog).toBeVisible()
  await loginDialog.getByLabel('Correo electronico').fill('qa@example.com')
  await loginDialog.locator('input[type="password"]').fill('QA-only-password')
  await loginDialog.getByRole('button', { name: 'Iniciar sesion' }).click()

  const successDialog = page.getByRole('dialog', { name: 'Alerta de búsqueda creada' })
  await expect(successDialog).toBeVisible()
  await expect(successDialog).toContainText('Ubicación: Vedado')
  expect(alerts).toHaveLength(1)
  expect(alerts[0]).toMatchObject({ user_id: ownerId, query: 'Vedado', operation: 'venta', property_type: 'apartamento' })
  expect(await page.evaluate(() => window.localStorage.getItem('cubitat-pending-search-alert'))).toBeNull()
  await expect(page).toHaveURL(/resultados\?q=Vedado&operacion=venta&tipo=apartamento/)
})

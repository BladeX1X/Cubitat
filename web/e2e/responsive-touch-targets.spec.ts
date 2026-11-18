import { expect, test } from '@playwright/test'

test('las acciones principales de inicio alcanzan 48 px en móvil táctil', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()

  await page.goto('/')

  await expect.poll(() => page.locator('.brand').evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48)
  await expect.poll(() => page.locator('.hero-search .operation-tabs > button').first().evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48)

  await context.close()
})

for (const width of [390, 400]) {
  test(`la paginación de resultados no desborda a ${width} px`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()

    await page.goto('/resultados?operacion=venta')
    await expect(page.locator('.app-shell.is-results-page')).toBeVisible()
    await page.evaluate(() => {
      const pagination = document.createElement('div')
      pagination.className = 'results-pagination flex items-center justify-center gap-2 mt-12 pb-6 select-none animate-fadeIn'
      pagination.innerHTML = '<button class="rounded-full px-4 h-9">Anterior</button><div class="flex items-center gap-1.5 mx-2"><button class="w-9 h-9">1</button><button class="w-9 h-9">2</button><button class="w-9 h-9">3</button><button class="w-9 h-9">4</button></div><button class="rounded-full px-4 h-9">Siguiente</button>'
      document.querySelector('.app-shell.is-results-page')?.append(pagination)
    })

    const nextButton = page.locator('.results-pagination > button').last()
    await expect(nextButton).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await expect.poll(() => nextButton.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(width)

    await context.close()
  })
}

for (const width of [320, 360, 390]) {
  test(`la hoja de filtros cabe en el panel a ${width} px`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()

    await page.goto('/resultados?operacion=venta')
    await page.getByRole('button', { name: /filtros/i }).first().click()
    const sheet = page.getByRole('dialog', { name: 'Filtros de búsqueda' })
    await expect(sheet).toBeVisible()
    await expect.poll(() => sheet.locator('.mobile-filter-sheet__panel').evaluate((panel) => {
      const body = panel.querySelector<HTMLElement>('.mobile-filter-sheet__body')
      const footer = panel.querySelector<HTMLElement>('.mobile-filter-sheet__footer')
      if (!body || !footer) return false
      const panelRect = panel.getBoundingClientRect()
      const footerRect = footer.getBoundingClientRect()
      return body.scrollWidth <= body.clientWidth
        && footer.scrollWidth <= footer.clientWidth
        && footerRect.right <= panelRect.right + 1
    })).toBe(true)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)

    await sheet.getByRole('button', { name: 'Cerrar filtros' }).click()
    await expect(sheet).toBeHidden()
    await context.close()
  })
}

test('los filtros y las flechas de fotos son cómodos en pantallas táctiles medianas', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 900 },
    hasTouch: true,
  })
  const page = await context.newPage()

  await page.goto('/resultados?operacion=venta')
  await expect(page.locator('.app-shell.is-results-page')).toBeVisible()
  await page.evaluate(() => {
    const toolbar = document.querySelector('.results-toolbar-full')
    const filter = document.createElement('button')
    filter.className = 'filter-control'
    filter.textContent = 'Tipo'
    toolbar?.append(filter)

    const alert = document.createElement('button')
    alert.className = 'filter-alert-control'
    alert.textContent = 'Crear alerta'
    toolbar?.append(alert)

    const photo = document.createElement('div')
    photo.className = 'property-photo'
    const arrow = document.createElement('button')
    arrow.className = 'property-photo-arrow'
    arrow.setAttribute('aria-label', 'Siguiente foto')
    photo.append(arrow)
    document.querySelector('.app-shell.is-results-page')?.append(photo)
  })

  for (const selector of ['.filter-control', '.filter-alert-control', '.property-photo-arrow']) {
    const dimensions = await page.locator(selector).last().evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    })
    expect(Math.min(dimensions.width, dimensions.height), `${selector} target was ${dimensions.width}×${dimensions.height}`).toBeGreaterThanOrEqual(48)
  }

  await context.close()
})

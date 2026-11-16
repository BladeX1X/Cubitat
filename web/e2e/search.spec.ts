import { test, expect } from '@playwright/test'
import { mockPublishedProperties } from './propertyFixtures'

test.describe('Flujo de Búsqueda y Filtros de Cubitat', () => {
  test('Comprar conserva resultados y filtros dentro del viewport móvil de 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 })
    await mockPublishedProperties(page)
    await page.goto('/resultados')
    await expect(page.locator('.property-card').first()).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)

    await page.getByRole('button', { name: 'Filtros', exact: true }).click()
    const filters = page.getByRole('dialog', { name: 'Filtros de búsqueda' })
    await expect(filters).toBeVisible()
    await expect.poll(() => filters.evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(320)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
    await filters.getByRole('button', { name: 'Cerrar filtros' }).click()
    await expect(filters).toHaveCount(0)
    await expect(page.locator('.property-card').first()).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
  })

  test('debería realizar una búsqueda, aplicar filtros avanzados y mostrar resultados uniformes', async ({ page }) => {
    await mockPublishedProperties(page)

    // 1. Navegar a la página de inicio
    await page.goto('/')
    await expect(page).toHaveTitle(/Cubitat/i)

    // 2. Seleccionar una ubicación mediante los controles estructurados
    const provinceSelect = page.getByRole('button', { name: 'Selecciona provincia' })
    await provinceSelect.click()
    await page.getByRole('option', { name: 'La Habana' }).click()

    const municipalitySelect = page.getByRole('button', { name: 'Selecciona municipio' })
    await municipalitySelect.click()
    await page.getByRole('option', { name: 'Plaza de la Revolución' }).click()

    // 3. Hacer clic en "Rentar" en la barra de pestañas superior de la búsqueda
    const rentButton = page.locator('button:has-text("Rentar")')
    await rentButton.click()

    // 4. Enviar la búsqueda
    const submitBtn = page.locator('button[aria-label="Buscar inmuebles"]')
    await submitBtn.click()

    // 5. Verificar navegación a resultados
    await expect(page).toHaveURL(/\/(resultados|renta\/)/i)

    // 6. Validar que la barra de filtros (FilterBar) esté visible
    const filterBar = page.locator('div[aria-label="Filtros activos"]')
    await expect(filterBar).toBeVisible()

    // 7. Modificar filtro de Operación mediante el Popover
    const operationDropdown = page.locator('button:has-text("Renta")') // Ya que seleccionamos "Rentar" en la home, el label dirá "Renta"
    await expect(operationDropdown).toBeVisible()
    await operationDropdown.click()

    // Marcar "Venta" en las casillas desanidadas
    const ventaCheckbox = page.locator('input#op-venta')
    await expect(ventaCheckbox).toBeVisible()
    await ventaCheckbox.click() // Selecciona Venta y cierra el popover automáticamente

    // Cerrar popover haciendo clic fuera o pulsando Escape
    await page.keyboard.press('Escape')

    // 8. Modificar filtro de Tipo de Inmueble
    const typeDropdown = page.locator('button:has-text("Inmueble")')
    await typeDropdown.click()

    const departamentoCheckbox = page.locator('input#type-apartamento')
    await expect(departamentoCheckbox).toBeVisible()
    await departamentoCheckbox.click() // Marca Departamento

    await page.keyboard.press('Escape')

    // 9. Aplicar un rango de precio personalizado en el Popover de Precio
    const priceDropdown = page.locator('button:has-text("Precio")')
    await priceDropdown.click()

    const minPriceInput = page.locator('input[placeholder="Mínimo"]')
    const maxPriceInput = page.locator('input[placeholder="Máximo"]')
    await minPriceInput.fill('20000')
    await maxPriceInput.fill('80000')

    const applyPriceBtn = page.locator('button:has-text("Aplicar rango")')
    await applyPriceBtn.click()

    // Verificar que el label del botón de precio se actualiza dinámicamente
    await expect(page.locator('button:has-text("$20000 - $80000")')).toBeVisible()

    // 10. Abrir filtros adicionales y verificar botones segmentados
    const moreFiltersBtn = page.locator('button:has-text("Filtros")')
    await moreFiltersBtn.click()

    // Seleccionar "2" recámaras dentro del popover w-80
    const popoverContent = page.locator('div.w-80')
    const twoBedroomsBtn = popoverContent.locator('button').filter({ hasText: /^2$/ }).first()
    await twoBedroomsBtn.click()

    // Hacer clic en "Ver resultados" en el footer de filtros adicionales
    const submitFiltersBtn = popoverContent.locator('button:has-text("Ver")')
    await submitFiltersBtn.click()

    // 11. Verificar que el catálogo muestra tarjetas de propiedad rediseñadas
    const cards = page.locator('.property-card')
    const count = await cards.count()
    const visiblePropertyIds = await page.locator('[data-property-card-id]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-property-card-id')).filter((id): id is string => Boolean(id)),
    )
    expect(new Set(visiblePropertyIds).size).toBe(visiblePropertyIds.length)

    if (count > 0) {
      // Tomamos la primera tarjeta y verificamos sus elementos uniformes rediseñados
      const firstCard = cards.first()

      // Elementos del encabezado
      await expect(firstCard.locator('.property-badges-row')).toBeVisible()
      await expect(firstCard.locator('.property-price-row')).toBeVisible()
      await expect(firstCard.locator('.property-title')).toBeVisible()

      // Rejilla de especificaciones
      await expect(firstCard.locator('.property-specs-grid')).toBeVisible()

      // Botones dobles de acción en el pie de la tarjeta
      await expect(firstCard.locator('.property-contact-btn')).toBeVisible()
      await expect(firstCard.locator('.property-whatsapp-btn')).toBeVisible()
    }
  })
})

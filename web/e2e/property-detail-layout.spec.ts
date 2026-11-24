import { expect, test } from '@playwright/test'
import { mockPublishedProperties } from './propertyFixtures'

const propertyId = '33333333-3333-4333-8333-333333333333'
const alignedSections = [
  '.detail-heading',
  '.detail-desktop-hero',
  '.detail-shell > .grid',
  '.detail-similar-section',
]

test('la ficha mantiene el mismo ancho y alineación en escritorio', async ({ page }) => {
  await mockPublishedProperties(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`/propiedad/${propertyId}`)
  await expect(page.getByRole('heading', { name: 'Apartamento QA en venta' })).toBeVisible({ timeout: 15_000 })

  const boxes = await Promise.all(alignedSections.map((selector) => page.locator(selector).boundingBox()))
  expect(boxes.every((box) => box !== null)).toBe(true)
  const measuredBoxes = boxes.filter((box) => box !== null)
  const firstBox = measuredBoxes[0]

  for (const box of measuredBoxes.slice(1)) {
    expect(Math.abs(box.x - firstBox.x)).toBeLessThan(1)
    expect(Math.abs(box.width - firstBox.width)).toBeLessThan(1)
  }
  expect(firstBox.width).toBe(1152)

  await page.setViewportSize({ width: 1024, height: 900 })
  const narrowerBoxes = await Promise.all(alignedSections.map((selector) => page.locator(selector).boundingBox()))
  const narrowerShell = await page.locator('.detail-shell').boundingBox()
  expect(narrowerBoxes.every((box) => box !== null)).toBe(true)
  const measuredNarrowerBoxes = narrowerBoxes.filter((box) => box !== null)
  const firstNarrowerBox = measuredNarrowerBoxes[0]

  for (const box of measuredNarrowerBoxes.slice(1)) {
    expect(Math.abs(box.x - firstNarrowerBox.x)).toBeLessThan(1)
    expect(Math.abs(box.width - firstNarrowerBox.width)).toBeLessThan(1)
  }
  expect(narrowerShell).not.toBeNull()
  expect(firstNarrowerBox.width).toBeCloseTo(Math.min(1152, narrowerShell!.width - 32), 1)
  expect(firstNarrowerBox.x).toBeCloseTo(narrowerShell!.x + (narrowerShell!.width - firstNarrowerBox.width) / 2, 1)
})

test('la barra de acciones es usable en móvil y el aviso oculto se puede restaurar', async ({ page }) => {
  await mockPublishedProperties(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/resultados')
  await expect(page.getByRole('heading', { name: '2 propiedades en Cuba' })).toBeVisible({ timeout: 15_000 })
  await page.locator(`[data-property-card-id="${propertyId}"]`).click()
  await expect(page.getByRole('heading', { name: 'Apartamento QA en venta' })).toBeVisible({ timeout: 15_000 })

  const toolbar = page.locator('.detail-heading .detail-actions')
  await expect(toolbar).toBeVisible()
  await expect(toolbar.getByRole('button', { name: 'Guardar propiedad' })).toBeVisible()
  await expect(toolbar.getByRole('button', { name: 'Notas personales' })).toBeVisible()
  await expect(toolbar.getByRole('button', { name: 'Ocultar aviso' })).toBeVisible()

  await toolbar.getByRole('button', { name: 'Notas personales' }).click()
  await page.getByRole('textbox', { name: 'Tu nota personal' }).fill('Confirmar medidas del balcón')
  await page.getByRole('button', { name: 'Guardar nota' }).click()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('cubitat:property-notes:v1')))
    .toContain('Confirmar medidas del balcón')

  await toolbar.getByRole('button', { name: 'Ocultar aviso' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Ocultar aviso' }).click()
  await expect(page.getByRole('heading', { name: '1 propiedades en Cuba' })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByRole('heading', { name: '2 propiedades en Cuba' })).toBeVisible({ timeout: 10_000 })
})

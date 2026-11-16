import { expect, test } from '@playwright/test'

test('mantiene accesibles las opciones del encabezado en anchos medianos', async ({ page }) => {
  await page.setViewportSize({ width: 956, height: 800 })
  await page.goto('/')

  const primaryNavigation = page.getByRole('navigation', { name: 'Navegacion principal' })
  await expect(primaryNavigation).toBeVisible()
  await expect(primaryNavigation.getByRole('link', { name: 'Comprar' })).toBeVisible()
  await expect(primaryNavigation.getByRole('link', { name: 'Rentar' })).toBeVisible()
  await expect(primaryNavigation.getByRole('link', { name: 'Permutar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publicar gratis' })).toBeVisible()
})

test('conserva el menú compacto en un viewport móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('navigation', { name: 'Navegacion principal' })).toBeHidden()
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await expect(page.getByRole('complementary', { name: 'Menú móvil' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Operaciones' }).getByRole('button', { name: 'Comprar' })).toBeVisible()
})

test('Ser agente no aparece en la navegación pública ni en el menú móvil', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')

  await expect(page.getByRole('navigation', { name: 'Navegacion principal' }).getByRole('link', { name: 'Ser agente' })).toHaveCount(0)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await expect(page.getByRole('navigation', { name: 'Operaciones' }).getByRole('button', { name: 'Ser agente' })).toHaveCount(0)
})

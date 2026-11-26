import { test, expect } from '@playwright/test'
import { mockDirectSupabaseReads } from './propertyFixtures'

test.describe('Flujo de Publicación de Inmuebles (Asistente 8 Pasos)', () => {
  test('no muestra a la cuenta actual un borrador antiguo sin propietario', async ({ page }) => {
    const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
    await mockDirectSupabaseReads(page)
    await page.route('**/auth/v1/user', async route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: ownerId, email: 'test@example.com', role: 'authenticated', aud: 'authenticated' }),
    }))
    await page.goto('/')
    await page.evaluate(() => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      localStorage.setItem('cubitat-auth-token', JSON.stringify({
        access_token: 'dummy-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
        refresh_token: 'dummy-refresh', user: { id: 'bb4455b8-0330-440d-ace3-33d0ba5fc28a', email: 'test@example.com' },
      }))
      localStorage.setItem('cubitat_publish_draft', JSON.stringify({
        description: 'Borrador privado sin cuenta asignada', contactName: 'Otra persona',
      }))
    })

    await page.goto('/publicar-inmueble')
    await expect(page.getByRole('heading', { name: 'Publicar propiedad' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('Borrador privado sin cuenta asignada')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('cubitat_publish_draft'))).toBeNull()
  })

  test('al crear una propiedad abre el formulario vacío y no pregunta por el borrador local', async ({ page }) => {
    const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
    await mockDirectSupabaseReads(page)
    await page.route('**/auth/v1/user', async route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: ownerId, email: 'test@example.com', role: 'authenticated', aud: 'authenticated' }),
    }))
    await page.goto('/')
    await page.evaluate(async (userId) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      localStorage.setItem('cubitat-auth-token', JSON.stringify({
        access_token: 'dummy-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
        refresh_token: 'dummy-refresh', user: { id: userId, email: 'test@example.com' },
      }))
      const request = indexedDB.open('cubitat-publication-drafts', 1)
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onupgradeneeded = () => request.result.createObjectStore('drafts')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const tx = db.transaction('drafts', 'readwrite')
      tx.objectStore('drafts').put({
        formData: { contactName: 'QA Draft', description: 'Borrador local de prueba' },
        images: [{ dataUrl: 'data:image/webp;base64,UklGRg==', size: 4, name: 'draft.webp' }],
        step: 6,
        existingAmenities: [],
      }, JSON.stringify([userId, null]))
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    }, ownerId)

    await page.goto('/publicar-inmueble')
    await expect(page.getByRole('heading', { name: 'Publicar propiedad' })).toBeVisible()
    await expect(page.getByText('Propiedad - Dirección y Ubicación')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('Borrador local de prueba')).not.toBeVisible()
    await expect(page.getByRole('group', { name: 'Foto 1: draft.webp' })).toHaveCount(0)
  })

  test('debería guiar por los pasos de dirección, información, características y guardar borrador', async ({ page }) => {
    await mockDirectSupabaseReads(page)
    // Interceptar la llamada de validación del token de Supabase
    await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'bb4455b8-0330-440d-ace3-33d0ba5fc28a',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' },
          role: 'authenticated',
          aud: 'authenticated'
        })
      })
    })

    // 1. Navegar al Home primero para poder acceder a localStorage sin errores de seguridad de origen
    await page.goto('/')

    // 2. Establecer la sesión de Supabase ficticia con expires_at en el futuro
    await page.evaluate(() => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      window.localStorage.setItem(
        'cubitat-auth-token',
        JSON.stringify({
          access_token: 'dummy-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: expiresAt,
          refresh_token: 'dummy-refresh',
          user: {
            id: 'bb4455b8-0330-440d-ace3-33d0ba5fc28a',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' }
          }
        })
      )
    })

    // 3. Navegar a la página de publicar
    await page.goto('/publicar-inmueble')

    // Verificar cabecera
    await expect(page.locator('h1')).toHaveText('Publicar propiedad')

    // 2. Paso 1: Dirección y Ubicación
    const streetInput = page.locator('input[placeholder*="Ej: Calle 23"]')
    await expect(streetInput).toBeVisible()
    await streetInput.fill('Calle 23 #456 e/ H e I')

    // Provincia
    const provinceSelect = page.locator('button:has-text("Selecciona")').first()
    await provinceSelect.click()
    
    // Seleccionar "La Habana" de las opciones
    await page.locator('[role="option"]:has-text("La Habana")').click()

    // El selector de municipios debería estar habilitado ahora
    const municipalitySelect = page.locator('button:has-text("Selecciona")').first()
    await municipalitySelect.click()
    await page.locator('[role="option"]:has-text("Playa")').click()

    // Clic en continuar
    await page.locator('button:has-text("Continuar")').click()

    // 3. Paso 2: Información General
    // Debería estar en el paso 2. Validamos el botón "Casa" que por defecto está seleccionado
    const casaBtn = page.locator('button:has-text("Casa")')
    await expect(casaBtn).toBeVisible()
    await expect(casaBtn).toHaveClass(/border-\[#035f53\]/) // Activo

    // Avanzar al Paso 3
    await page.locator('button:has-text("Continuar")').click()

    // 4. Paso 3: Características (Cuadrícula de contadores)
    const recamarasVal = page.locator('span:text-is("Recámaras") + div span')
    await expect(recamarasVal).toHaveText('1') // Valor por defecto

    // Clic en el botón más de Recámaras (el segundo botón en el panel de Recámaras)
    const plusRecamaras = page.locator('span:text-is("Recámaras") + div button').last()
    await plusRecamaras.click()
    await expect(recamarasVal).toHaveText('2') // Incrementado

    // 5. Test de Guardado de Borrador manual
    const saveBtn = page.locator('button:has-text("Guardar Borrador")')
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    // Feedback de borrador guardado visible
    await expect(page.locator('span:has-text("¡Borrador guardado!")')).toBeVisible()
  })

  test('sale de un borrador reanudado y conserva la instantánea guardada', async ({ page }) => {
    const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
    let propertyWrites = 0
    await mockDirectSupabaseReads(page)
    await page.route('**/auth/v1/user', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: ownerId, email: 'test@example.com', role: 'authenticated', aud: 'authenticated' }),
    }))
    await page.route('**/rest/v1/properties*', async route => {
      if (['POST', 'PATCH', 'DELETE'].includes(route.request().method())) propertyWrites++
      await route.continue()
    })
    await page.goto('/')
    await page.evaluate(async userId => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      localStorage.setItem('cubitat-auth-token', JSON.stringify({
        access_token: 'dummy-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
        refresh_token: 'dummy-refresh', user: { id: userId, email: 'test@example.com' },
      }))
      const request = indexedDB.open('cubitat-publication-drafts', 1)
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onupgradeneeded = () => request.result.createObjectStore('drafts')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const tx = db.transaction('drafts', 'readwrite')
      tx.objectStore('drafts').put({
        formData: { contactName: 'Ana QA', contactPhone: '+525512345678', description: 'Borrador conservado' },
        images: [], step: 8, existingAmenities: [],
      }, JSON.stringify([userId, null]))
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    }, ownerId)

    await page.goto('/publicar?load_draft=true')
    const contactName = page.locator('input[placeholder*="Ej: Alejandro"]')
    await expect(contactName).toHaveValue('Ana QA')
    await contactName.fill('Cambio temporal QA')
    await expect.poll(async () => page.evaluate(async userId => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('cubitat-publication-drafts', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const value = await new Promise<{ formData?: { contactName?: string } }>((resolve, reject) => {
        const request = db.transaction('drafts').objectStore('drafts').get(JSON.stringify([userId, null]))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      db.close()
      return value.formData?.contactName
    }, ownerId)).toBe('Cambio temporal QA')

    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Salir sin guardar' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect.poll(async () => page.evaluate(async userId => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('cubitat-publication-drafts', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const value = await new Promise<{ formData?: { contactName?: string } }>((resolve, reject) => {
        const request = db.transaction('drafts').objectStore('drafts').get(JSON.stringify([userId, null]))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      db.close()
      return value.formData?.contactName
    }, ownerId)).toBe('Ana QA')
    expect(propertyWrites).toBe(0)
  })

  test('sale de editar sin guardar y no envía una escritura de la propiedad', async ({ page }) => {
    const ownerId = 'bb4455b8-0330-440d-ace3-33d0ba5fc28a'
    const propertyId = 'qa-edit-without-save'
    let propertyWrites = 0
    let confirmationAccepted = false
    let savedPropertyPatch: Record<string, unknown> | null = null

    await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: ownerId,
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' },
          role: 'authenticated',
          aud: 'authenticated',
        }),
      })
    })
    await page.route('**/rest/v1/**', async route => {
      const request = route.request()
      const url = new URL(request.url())
      if (request.method() === 'GET' && url.pathname.endsWith('/properties') && url.searchParams.get('id') === `eq.${propertyId}`) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: propertyId,
            user_id: ownerId,
            title: 'Casa QA de prueba',
            operation: 'venta',
            property_type: 'casa',
            description: 'Descripción original QA',
            price_usd: 68000,
            location: 'Calle 10 #12, Playa, La Habana',
            bedrooms: 2,
            bathrooms: 1,
            parking: 0,
            area_m2: 80,
            age_years: 5,
            amenities: [],
            features: {},
            images: [],
            contact_info: { name: 'Ana QA', phone: '+525512345678' },
            property_contact_details: { name: 'Ana QA', phone: '+525512345678', email: null },
            coordinates: null,
          }),
        })
        return
      }

      if (request.method() === 'PATCH' && url.pathname.endsWith('/properties')) {
        propertyWrites += 1
        savedPropertyPatch = request.postDataJSON() as Record<string, unknown>
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: propertyId }]) })
        return
      }

      if (request.method() !== 'GET' && url.pathname.endsWith('/properties')) propertyWrites += 1
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
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
        user: { id: ownerId, email: 'test@example.com', user_metadata: { full_name: 'Test User' } },
      }))
    }, ownerId)
    await page.goto(`/editar/${propertyId}`)
    await expect(page.getByRole('heading', { name: 'Editar propiedad' })).toBeVisible()
    const streetInput = page.getByPlaceholder('Ej: Calle 23 #456 e/ H e I')
    await expect(streetInput).toHaveValue('Calle 10 #12')
    await streetInput.fill('Cambio temporal QA')

    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm')
      await dialog.dismiss()
    })
    await page.getByRole('button', { name: 'Salir sin guardar' }).click()
    await expect(page.getByRole('heading', { name: 'Editar propiedad' })).toBeVisible()
    await expect(streetInput).toHaveValue('Cambio temporal QA')
    expect(propertyWrites).toBe(0)

    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
      confirmationAccepted = true
    })
    await page.getByRole('button', { name: 'Salir sin guardar' }).click()

    await expect(page).toHaveURL(/\/mis-propiedades$/)
    expect(confirmationAccepted).toBe(true)
    expect(propertyWrites).toBe(0)

    await page.evaluate(async ({ ownerId, propertyId }) => {
      const request = indexedDB.open('cubitat-publication-drafts', 1)
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onupgradeneeded = () => request.result.createObjectStore('drafts')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const transaction = db.transaction('drafts', 'readwrite')
      transaction.objectStore('drafts').put({
        formData: {},
        images: [],
        step: 8,
        existingAmenities: [],
        edited: false,
      }, JSON.stringify([ownerId, propertyId]))
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
      db.close()
    }, { ownerId, propertyId })

    await page.goto(`/editar/${propertyId}`)
    await expect(page.getByRole('heading', { name: 'Editar propiedad' })).toBeVisible()
    expect(propertyWrites).toBe(0)

    const contactName = page.locator('input[placeholder*="Ej: Alejandro"]')
    const contactPhone = page.locator('input[type="tel"]')
    await expect(contactName).toHaveValue('Ana QA')
    await expect(contactPhone).toHaveValue('+525512345678')
    await contactName.fill('Ana QA actualizada')
    await page.getByRole('button', { name: 'Guardar Cambios' }).first().click()

    await expect(page.getByRole('heading', { name: '¡Publicación recibida!' })).toBeVisible()
    expect(propertyWrites).toBe(1)
    expect(savedPropertyPatch).toMatchObject({
      status: 'pending_review',
      contact_info: { name: 'Ana QA actualizada', phone: '+525512345678' },
    })

  })
})

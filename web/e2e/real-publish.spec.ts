import { test, expect } from '@playwright/test'
import { assertLocalMutationTarget } from './qaTarget'

const E2E_EMAIL = process.env.CUBITAT_E2E_EMAIL
const E2E_PASSWORD = process.env.CUBITAT_E2E_PASSWORD
const E2E_SESSION_JSON = process.env.CUBITAT_E2E_SESSION
const SUPABASE_URL = process.env.CUBITAT_E2E_SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? 'http://127.0.0.1:54321'
const BASE_URL = process.env.CUBITAT_E2E_BASE_URL ?? 'http://127.0.0.1:5174'
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const ALLOW_MUTATIONS = process.env.CUBITAT_E2E_ALLOW_MUTATIONS === 'true'
type E2ESession = {
  access_token: string
  refresh_token: string
  user: { id: string; [key: string]: unknown }
}
type CleanupState = {
  userId: string
  accessToken: string
  marker: string
  uploadedImagePaths: Set<string>
}
let cleanupState: CleanupState | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ownedImagePath(value: unknown, userId: string): string | null {
  if (typeof value !== 'string') return null
  const directPath = new RegExp(`^${userId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.webp$`, 'i')
  if (directPath.test(value)) return value
  try {
    const path = new URL(value, SUPABASE_URL).pathname
    const match = path.match(new RegExp(`/storage/v1/object/(?:public/)?property_images/${userId}/([0-9a-f-]{36}\\.webp)$`, 'i'))
    return match ? `${userId}/${match[1]}` : null
  } catch {
    return null
  }
}

test.describe('Publicación Real E2E', () => {
  test.skip(!E2E_SESSION_JSON && (!E2E_EMAIL || !E2E_PASSWORD), 'Salta: definir CUBITAT_E2E_EMAIL y CUBITAT_E2E_PASSWORD o una sesión QA temporal')
  test.skip(!ANON_KEY, 'Salta: definir VITE_SUPABASE_ANON_KEY')
  test.skip(!ALLOW_MUTATIONS, 'Salta: definir CUBITAT_E2E_ALLOW_MUTATIONS=true')

  test.afterEach(async ({ request }) => {
    const cleanup = cleanupState
    cleanupState = null
    if (!cleanup) return

    const headers = {
      apikey: ANON_KEY!,
      Authorization: `Bearer ${cleanup.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
    const failures: string[] = []
    const propertiesUrl = new URL('/rest/v1/properties', SUPABASE_URL)
    propertiesUrl.searchParams.set('user_id', `eq.${cleanup.userId}`)
    propertiesUrl.searchParams.set('description', `eq.${cleanup.marker}`)
    propertiesUrl.searchParams.set('select', 'id,images,cover_image')

    const propertyRead = await request.get(propertiesUrl.toString(), { headers })
    const imagePaths = new Set(cleanup.uploadedImagePaths)
    if (propertyRead.ok()) {
      const rows: unknown = await propertyRead.json()
      if (Array.isArray(rows)) {
        for (const candidate of rows) {
          if (!isRecord(candidate)) continue
          const coverPath = ownedImagePath(candidate.cover_image, cleanup.userId)
          if (coverPath) imagePaths.add(coverPath)
          if (Array.isArray(candidate.images)) {
            for (const reference of candidate.images) {
              const imagePath = ownedImagePath(reference, cleanup.userId)
              if (imagePath) imagePaths.add(imagePath)
            }
          }
          if (typeof candidate.id === 'string') {
            const deleteUrl = new URL('/rest/v1/properties', SUPABASE_URL)
            deleteUrl.searchParams.set('id', `eq.${candidate.id}`)
            deleteUrl.searchParams.set('user_id', `eq.${cleanup.userId}`)
            const deleted = await request.delete(deleteUrl.toString(), { headers })
            if (!deleted.ok()) failures.push(`property cleanup HTTP ${deleted.status()}`)
          }
        }
      }
    } else {
      failures.push(`property lookup HTTP ${propertyRead.status()}`)
    }

    for (const path of imagePaths) {
      const deleted = await request.delete(`${SUPABASE_URL}/storage/v1/object/property_images`, {
        headers,
        data: { prefixes: [path] },
      })
      if (!deleted.ok() && deleted.status() !== 404) failures.push(`photo cleanup HTTP ${deleted.status()}`)
    }
    if (failures.length > 0) throw new Error(`No se pudo limpiar el E2E local: ${failures.join(', ')}`)
  })

  test('flujo completo: login real → publicar → pending_review → no en resultados → limpiar', async ({ page, request }) => {
    test.setTimeout(90_000)
    assertLocalMutationTarget(BASE_URL, SUPABASE_URL)
    const qaMarker = `qa-e2e-publish-${Date.now()}`
    // 1. Use a real Supabase session. Local QA may obtain it through a one-time
    // admin-generated magic link when password sign-in requires Turnstile.
    let session: E2ESession
    if (E2E_SESSION_JSON) {
      session = JSON.parse(E2E_SESSION_JSON) as typeof session
    } else {
      const authRes = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        headers: { apikey: ANON_KEY!, 'Content-Type': 'application/json' },
        data: { email: E2E_EMAIL, password: E2E_PASSWORD },
      })
      const responseBody = await authRes.json().catch(() => ({})) as { msg?: string; message?: string; error_code?: string }
      expect(authRes.ok(), `Supabase Auth rejected QA sign-in (${authRes.status()}): ${responseBody.error_code ?? responseBody.msg ?? responseBody.message ?? 'unknown error'}`).toBeTruthy()
      session = responseBody as E2ESession
    }
    expect(session.access_token).toBeTruthy()
    expect(session.refresh_token).toBeTruthy()
    expect(session.user?.id).toBeTruthy()
    cleanupState = {
      userId: session.user.id,
      accessToken: session.access_token,
      marker: qaMarker,
      uploadedImagePaths: new Set(),
    }
    page.on('response', async (response) => {
      if (new URL(response.url()).pathname !== '/api/property-images/upload' || !response.ok()) return
      try {
        const body: unknown = await response.json()
        if (isRecord(body)) {
          const path = ownedImagePath(body.path, session.user.id)
          if (path) cleanupState?.uploadedImagePaths.add(path)
        }
      } catch {
        // A failed or malformed upload response has no confirmed object path.
      }
    })

    // 2. Inyectar sesión en el browser
    await page.goto('/')
    await page.evaluate((sess) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
        access_token: sess.access_token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expiresAt,
        refresh_token: sess.refresh_token,
        user: sess.user,
      }))
    }, session)
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 3. Navegar a publicar
    await page.goto('/publicar')
    await expect(page.locator('h1')).toHaveText('Publicar propiedad')

    // --- Step 1: Dirección ---
    const streetInput = page.locator('input[placeholder*="Ej: Calle 23"]')
    await expect(streetInput).toBeVisible()
    await streetInput.fill('Calle 23 #456 e/ H e I')

    await page.locator('button:has-text("Selecciona")').first().click()
    await page.locator('[role="option"]:has-text("La Habana")').click()

    await page.locator('button:has-text("Selecciona")').first().click()
    await page.locator('[role="option"]:has-text("Playa")').click()

    await page.locator('button:has-text("Continuar")').click()

    // --- Step 2: Info General (defaults: Casa, Venta) ---
    await page.locator('button:has-text("Continuar")').click()

    // --- Step 3: Características ---
    await page.locator('#chk-unk-const').check()
    await page.locator('#chk-unk-land').check()
    await page.locator('button:has-text("Continuar")').click()

    // --- Step 4: Amenidades (sin selección) ---
    await page.locator('button:has-text("Continuar")').click()

    // --- Step 5: Descripción ---
    await page.locator('textarea').fill(qaMarker)
    await page.locator('button:has-text("Continuar")').click()

    // --- Step 6: Imágenes ---
    await page.setInputFiles('input[type="file"]', 'src/assets/hero.png')
    const selectedPhoto = page.getByRole('group', { name: /Foto 1:/ })
    await expect(selectedPhoto).toBeVisible({ timeout: 15000 })
    await expect(selectedPhoto.locator('div.absolute.inset-0'))
      .toHaveAttribute('style', /data:image\/webp;base64,/)
    await expect(page.locator('text=Comprimiendo')).not.toBeVisible({ timeout: 15000 })
    await page.locator('button:has-text("Continuar")').click()

    // --- Step 7: Precio ---
    await page.locator('input[type="number"]').first().fill('50000')
    await page.locator('button:has-text("Continuar")').click()

    // --- Step 8: Contacto ---
    await page.locator('input[placeholder*="Ej: Alejandro"]').fill('Test E2E')
    await page.locator('input[type="tel"]').fill('+5351234567')

    // --- Submit ---
    await page.locator('button[type="submit"]').click()

    // 4. Verificar feedback de éxito
    await expect(page.locator('text=Publicación recibida')).toBeVisible({ timeout: 45000 })

    // 5. Confirmar en Supabase que se guardó exactamente el anuncio y que
    // sigue privado mientras espera revisión.
    const ownerPropertiesUrl = new URL('/rest/v1/properties', SUPABASE_URL)
    ownerPropertiesUrl.searchParams.set('user_id', `eq.${session.user.id}`)
    ownerPropertiesUrl.searchParams.set('description', `eq.${qaMarker}`)
    ownerPropertiesUrl.searchParams.set('select', 'id,title,status,images,cover_image')
    const ownerPropertiesResponse = await request.get(ownerPropertiesUrl.toString(), {
      headers: { apikey: ANON_KEY!, Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' },
    })
    expect(ownerPropertiesResponse.ok()).toBeTruthy()
    const ownerRows: unknown = await ownerPropertiesResponse.json()
    expect(Array.isArray(ownerRows) ? ownerRows : []).toHaveLength(1)
    if (!Array.isArray(ownerRows) || !isRecord(ownerRows[0])) {
      throw new Error('Supabase no devolvió la publicación QA del propietario.')
    }
    const savedProperty = ownerRows[0]
    expect(savedProperty.status).toBe('pending_review')
    const savedPhotoPath = ownedImagePath(savedProperty.cover_image, session.user.id)
    expect(savedPhotoPath).toBeTruthy()
    expect(Array.isArray(savedProperty.images)).toBe(true)
    if (!Array.isArray(savedProperty.images)) throw new Error('Supabase no guardó la galería de fotos QA.')
    expect(savedProperty.images).toContain(savedProperty.cover_image)

    const storedPhotoResponse = await request.get(
      `${SUPABASE_URL}/storage/v1/object/property_images/${savedPhotoPath!.split('/').map(encodeURIComponent).join('/')}`,
      { headers: { apikey: ANON_KEY!, Authorization: `Bearer ${session.access_token}` } },
    )
    expect(storedPhotoResponse.ok()).toBeTruthy()
    expect(storedPhotoResponse.headers()['content-type']).toContain('image/webp')

    // Anonymous PostgREST must not expose the pending property.
    const publicPropertiesUrl = new URL('/rest/v1/properties', SUPABASE_URL)
    publicPropertiesUrl.searchParams.set('id', `eq.${String(savedProperty.id)}`)
    publicPropertiesUrl.searchParams.set('select', 'id')
    const publicPropertiesResponse = await request.get(publicPropertiesUrl.toString(), {
      headers: { apikey: ANON_KEY!, Authorization: `Bearer ${ANON_KEY}`, Accept: 'application/json' },
    })
    expect(publicPropertiesResponse.ok()).toBeTruthy()
    const publicRows: unknown = await publicPropertiesResponse.json()
    expect(Array.isArray(publicRows) ? publicRows : []).toHaveLength(0)

    // The authenticated publications list must be able to download and render
    // the same private cover photo that was just uploaded.
    await page.goto('/mis-propiedades')
    await expect(page.getByRole('heading', { name: 'Mis publicaciones' })).toBeVisible()
    const ownCover = page.getByRole('img', { name: String(savedProperty.title) })
    await expect(ownCover).toBeVisible()
    await expect(ownCover).toHaveAttribute('src', /^blob:/)
    await expect.poll(() => ownCover.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)

    // Reopen the saved announcement as its owner and verify edit hydration for
    // the contact fields and private photo preview.
    await page.goto(`/editar/${String(savedProperty.id)}`)
    await expect(page.getByRole('heading', { name: 'Editar propiedad' })).toBeVisible()
    await page.getByRole('button', { name: 'Imágenes' }).click()
    const editPhoto = page.getByRole('group', { name: /Foto 1:/ })
    await expect(editPhoto).toBeVisible()
    await expect(editPhoto.locator('div.absolute.inset-0')).toHaveAttribute('style', /blob:/)
    await page.getByRole('button', { name: 'Contacto y Publicar' }).click()
    const editContactName = page.locator('input[placeholder*="Ej: Alejandro"]')
    const editContactPhone = page.locator('input[type="tel"]')
    await expect(editContactName).toHaveValue('Test E2E')
    await expect(editContactPhone).toHaveValue(/5351234567/)

    // Leaving the real editor without saving must discard the local draft and
    // keep the owner-protected contact row unchanged in Supabase.
    await editContactName.fill('Cambio temporal sin guardar')
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })
    await page.getByRole('button', { name: 'Salir sin guardar' }).click()
    await expect(page).toHaveURL(/\/mis-propiedades$/)

    const savedContactUrl = new URL('/rest/v1/property_contact_details', SUPABASE_URL)
    savedContactUrl.searchParams.set('property_id', `eq.${String(savedProperty.id)}`)
    savedContactUrl.searchParams.set('select', 'name,phone')
    const savedContactResponse = await request.get(savedContactUrl.toString(), {
      headers: { apikey: ANON_KEY!, Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' },
    })
    expect(savedContactResponse.ok()).toBeTruthy()
    const savedContactRows: unknown = await savedContactResponse.json()
    expect(Array.isArray(savedContactRows) ? savedContactRows : []).toEqual([
      { name: 'Test E2E', phone: '+5351234567' },
    ])

    await page.goto(`/editar/${String(savedProperty.id)}`)
    await expect(page.getByRole('heading', { name: 'Editar propiedad' })).toBeVisible()
    await page.getByRole('button', { name: 'Contacto y Publicar' }).click()
    await expect(page.locator('input[placeholder*="Ej: Alejandro"]')).toHaveValue('Test E2E')

    await page.locator('input[placeholder*="Ej: Alejandro"]').fill('Test E2E guardado')
    await page.getByRole('button', { name: 'Guardar Cambios' }).first().click()
    await expect(page.getByRole('heading', { name: '¡Publicación recibida!' })).toBeVisible({ timeout: 45000 })

    const updatedPropertyUrl = new URL('/rest/v1/properties', SUPABASE_URL)
    updatedPropertyUrl.searchParams.set('id', `eq.${String(savedProperty.id)}`)
    updatedPropertyUrl.searchParams.set('user_id', `eq.${session.user.id}`)
    updatedPropertyUrl.searchParams.set('select', 'id,status')
    const updatedPropertyResponse = await request.get(updatedPropertyUrl.toString(), {
      headers: { apikey: ANON_KEY!, Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' },
    })
    expect(updatedPropertyResponse.ok()).toBeTruthy()
    expect(await updatedPropertyResponse.json()).toEqual([
      { id: savedProperty.id, status: 'pending_review' },
    ])

    const updatedContactResponse = await request.get(savedContactUrl.toString(), {
      headers: { apikey: ANON_KEY!, Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' },
    })
    expect(updatedContactResponse.ok()).toBeTruthy()
    expect(await updatedContactResponse.json()).toEqual([
      { name: 'Test E2E guardado', phone: '+5351234567' },
    ])
  })
})

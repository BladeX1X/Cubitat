import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { assertLocalMutationTarget } from './qaTarget'

const SESSION_JSON = process.env.CUBITAT_E2E_SESSION
const SUPABASE_URL = process.env.CUBITAT_E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const BASE_URL = process.env.CUBITAT_E2E_BASE_URL ?? 'http://127.0.0.1:5174'
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const ALLOW_MUTATIONS = process.env.CUBITAT_E2E_ALLOW_MUTATIONS === 'true'
type Session = { access_token: string; refresh_token: string; user: { id: string; [key: string]: unknown } }
type ListingKind = 'service' | 'material'

test.skip(!SESSION_JSON, 'Salta: definir CUBITAT_E2E_SESSION con una sesión QA temporal')
test.skip(!ANON_KEY, 'Salta: definir VITE_SUPABASE_ANON_KEY')
test.skip(!ALLOW_MUTATIONS, 'Salta: definir CUBITAT_E2E_ALLOW_MUTATIONS=true')

async function installSession(page: Page, session: Session) {
  await page.goto('/')
  await page.evaluate((value) => {
    window.localStorage.setItem('cubitat-auth-token', JSON.stringify({
      access_token: value.access_token,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: value.refresh_token,
      user: value.user,
    }))
  }, session)
  await page.reload()
}

async function readOwnedRows(request: APIRequestContext, session: Session, kind: ListingKind) {
  const endpoint = kind === 'service' ? 'get_my_home_service_providers' : 'get_my_material_listings'
  const response = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${endpoint}`, {
    headers: { apikey: ANON_KEY!, Authorization: `Bearer ${session.access_token}` },
  })
  expect(response.ok(), `${endpoint} must return this QA owner's listings`).toBeTruthy()
  const rows: unknown = await response.json()
  expect(Array.isArray(rows)).toBe(true)
  return rows as Array<Record<string, unknown>>
}

async function removeOwnedRows(request: APIRequestContext, session: Session, kind: ListingKind, marker: string) {
  const rows = await readOwnedRows(request, session, kind)
  const ownedRows = rows.filter((row) => typeof row.description === 'string' && row.description.includes(marker))
  for (const row of ownedRows) {
    const id = typeof row.id === 'string' ? row.id : ''
    if (!id) continue
    const references = kind === 'service' ? row.gallery_urls : row.photo_urls
    const bucket = kind === 'service' ? 'home-service-photos' : 'material-listings'
    const paths = Array.isArray(references) ? references.filter((path): path is string => typeof path === 'string' && /^[0-9a-f-]{36}\/[0-9a-f-]{36}(?:\/[0-9a-f-]{36})?\.webp$/i.test(path)) : []
    const rpc = kind === 'service' ? 'update_home_service_provider' : 'update_material_listing'
    const input = kind === 'service'
      ? {
          p_id: id, p_display_name: row.display_name, p_category: row.category,
          p_description: row.description, p_province: row.province,
          p_municipalities: row.municipalities ?? [], p_phone: row.phone ?? null,
          p_whatsapp: row.whatsapp ?? null, p_gallery_urls: [],
        }
      : {
          p_id: id, p_title: row.title, p_category: row.category,
          p_description: row.description, p_price: row.price ?? null,
          p_currency: row.currency, p_province: row.province,
          p_availability: row.availability, p_phone: row.phone ?? null,
          p_whatsapp: row.whatsapp ?? null, p_photo_urls: [],
        }
    const detached = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
      headers: { apikey: ANON_KEY!, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      data: input,
    })
    expect(detached.ok(), `owner can detach QA ${kind} photos before account cleanup`).toBeTruthy()
    if (paths.length) {
      const removed = await request.delete(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
        headers: { apikey: ANON_KEY!, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        data: { prefixes: paths },
      })
      expect(removed.ok(), `owned ${kind} QA photos must be removable`).toBeTruthy()
    }
  }
}

async function runPublication(page: Page, request: APIRequestContext, kind: ListingKind) {
  test.setTimeout(120_000)
  assertLocalMutationTarget(BASE_URL, SUPABASE_URL)
  const session = JSON.parse(SESSION_JSON!) as Session
  expect(session.access_token).toBeTruthy()
  expect(session.user?.id).toBeTruthy()
  const marker = `qa-real-${kind}-${Date.now()}`
  const materialUploadResults: string[] = []
  const browserErrors: string[] = []
  if (kind === 'material') {
    page.on('request', (request) => {
      if (request.url().includes('/api/material-photos/')) materialUploadResults.push(`request ${request.method()} ${request.url()}`)
    })
    page.on('response', async (response) => {
      if (!new URL(response.url()).pathname.includes('/api/material-photos/')) return
      materialUploadResults.push(`${response.status()} ${await response.text().catch(() => '')}`)
    })
    page.on('requestfailed', (request) => {
      if (request.url().includes('/api/material-photos/')) materialUploadResults.push(`request failed: ${request.failure()?.errorText ?? 'unknown'}`)
    })
    page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()) })
  }

  try {
    await installSession(page, session)
    await page.goto(kind === 'service' ? '/publicar-servicio' : '/publicar-material')
    if (kind === 'service') {
      await expect(page.getByRole('heading', { name: 'Presenta tus servicios' })).toBeVisible()
      await page.getByLabel('Nombre del profesional o negocio').fill(`Servicio ${marker}`)
      await page.getByLabel('Provincia').fill('La Habana')
      await page.getByLabel('Descripción').fill(`Perfil QA temporal ${marker}, con dos fotos para verificar carga privada.`)
      await page.getByLabel('Fotos de tus trabajos').setInputFiles(['src/assets/hero.png', 'src/assets/hero.png'])
      await expect(page.getByText('2 de 10 fotos. La primera será la portada del anuncio.')).toBeVisible()
      await page.getByRole('button', { name: 'Enviar a revisión' }).click()
      await expect(page.getByRole('heading', { name: 'Perfil enviado a revisión' })).toBeVisible()
    } else {
      await expect(page.getByRole('heading', { name: 'Anuncia materiales' })).toBeVisible()
      await page.getByLabel('Nombre del producto').fill(`Material ${marker}`)
      await page.getByLabel('Provincia').fill('La Habana')
      await page.getByLabel('Descripción').fill(`Anuncio QA temporal ${marker}, con dos fotos para verificar carga privada.`)
      await page.getByLabel('Fotos del producto').setInputFiles(['src/assets/hero.png', 'src/assets/hero.png'])
      await expect(page.getByText('2 de 10 fotos. La primera será la portada del anuncio.')).toBeVisible()
      await page.getByRole('button', { name: 'Enviar a revisión' }).click()
      await expect(page.getByRole('heading', { name: 'Anuncio enviado a revisión' }), `Resultado de carga de fotos: ${materialUploadResults.join(' | ') || 'sin respuesta del gateway'}; errores: ${browserErrors.join(' | ')}`).toBeVisible()
    }

    const rows = await readOwnedRows(request, session, kind)
    const created = rows.filter((row) => typeof row.description === 'string' && row.description.includes(marker))
    expect(created, 'must create exactly one pending listing for the QA marker').toHaveLength(1)
    const listing = created[0]!
    expect(listing.status).toBe('pending_review')
    const paths = kind === 'service' ? listing.gallery_urls : listing.photo_urls
    expect(paths).toHaveLength(2)
    expect(paths.every((path) => typeof path === 'string' && path.startsWith(`${session.user.id}/`) && path.endsWith('.webp'))).toBe(true)

    const bucket = kind === 'service' ? 'home-service-photos' : 'material-listings'
    for (const path of paths as string[]) {
      const downloaded = await request.get(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
        headers: { apikey: ANON_KEY!, Authorization: `Bearer ${session.access_token}` },
      })
      expect(downloaded.ok(), `owner can read uploaded ${kind} photo`).toBeTruthy()
      expect(downloaded.headers()['content-type']).toContain('image/webp')
      expect((await downloaded.body()).byteLength).toBeGreaterThan(0)
    }
  } finally {
    await removeOwnedRows(request, session, kind, marker)
  }
}

test('Servicios: publicar con varias fotos reales en Supabase local', async ({ page, request }) => {
  await runPublication(page, request, 'service')
})

test('Materiales: publicar con varias fotos reales en Supabase local y Worker local', async ({ page, request }) => {
  await runPublication(page, request, 'material')
})

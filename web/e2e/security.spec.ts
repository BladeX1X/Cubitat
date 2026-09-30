import { test, expect } from '@playwright/test'

const BASE_URL = process.env.CUBITAT_E2E_BASE_URL ?? 'http://localhost:5173'
const SUPABASE_URL = process.env.CUBITAT_E2E_SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? 'https://tohjzoncoosvjbjcakdl.supabase.co'

test.describe('Auditoría de Seguridad - Evasión de Proxy y Anon Key', () => {
  test('debería bloquear el acceso directo a Supabase con la clave dummy (Evasión Bloqueada)', async ({ request }) => {
    // Intentar consultar directamente el endpoint real de Supabase usando la clave dummy del cliente
    const response = await request.get(`${SUPABASE_URL}/rest/v1/properties`, {
      headers: {
        'apikey': 'dummy-key-safe-from-browsers'
      }
    })

    // La base de datos debe rechazar la conexión con 401 ya que la clave real no está expuesta
    expect(response.status()).toBe(401)
  })

  test('debería permitir acceso legítimo a través del proxy local', async ({ request }) => {
    // Consultar a través de la ruta proxy, la cual inyecta la clave real del lado del servidor
    const response = await request.get(`${BASE_URL}/api/supabase/rest/v1/properties?limit=1`, {
      headers: {
        'apikey': 'dummy-key-safe-from-browsers'
      }
    })

    // El proxy local reescribe las cabeceras correctamente, por lo que debe devolver 200 OK
    expect(response.status()).toBe(200)
  })

  test('debería rechazar moderación IA con token inválido', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/ai-moderate`, {
      headers: {
        Authorization: 'Bearer invalid-test-token',
      },
      data: {
        property_id: '00000000-0000-0000-0000-000000000000',
        title: 'Intento de bypass',
        location: 'Cuba',
        description: 'No debe iniciar moderación',
        price_usd: 1,
        property_type: 'casa',
        images: [],
      },
    })

    expect(response.status()).toBe(401)
  })

  test('debería rechazar métricas internas sin sesión admin', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/metrics`, {
      headers: {
        Authorization: 'Bearer invalid-test-token',
      },
    })

    expect(response.status()).toBe(401)
  })
})

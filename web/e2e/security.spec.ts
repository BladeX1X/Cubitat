import { test, expect } from '@playwright/test'
import { assertLoopbackSecurityProbeTargets } from './qaTarget'

const BASE_URL = process.env.CUBITAT_E2E_BASE_URL
  ?? `http://127.0.0.1:${process.env.CUBITAT_E2E_PORT ?? '5174'}`
const SUPABASE_URL = process.env.CUBITAT_E2E_SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? 'http://127.0.0.1:54321'

// This spec must stay local even when a separate E2E run opts in to cloud targets.
assertLoopbackSecurityProbeTargets(BASE_URL, SUPABASE_URL)

test.describe('Auditoría de Seguridad - Evasión de Proxy y Anon Key', () => {
  test('debería bloquear el acceso directo a Supabase con la clave dummy (Evasión Bloqueada)', async ({ request }) => {
    // Intentar consultar el Supabase local con una clave dummy de cliente
    const response = await request.get(`${SUPABASE_URL}/rest/v1/properties`, {
      headers: {
        'apikey': 'dummy-key-safe-from-browsers'
      }
    })

    // Supabase local debe rechazar la conexión con 401 porque la clave no es válida
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

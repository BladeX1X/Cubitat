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
    const response = await request.get(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: 'dummy-key-safe-from-browsers',
        Authorization: 'Bearer dummy-key-safe-from-browsers',
      },
    })

    // Auth debe rechazar una clave/credencial dummy aunque el esquema aún no tenga tablas.
    expect([401, 403]).toContain(response.status())
  })

  test('debería reenviar la consulta al PostgREST local a través del proxy', async ({ request }) => {
    // PostgREST puede devolver PGRST205 si la tabla no existe o 42501 si el esquema
    // local sí la tiene y el rol anónimo carece de permiso. Ambos prueban el reenvío;
    // un fallo de conectividad del proxy respondería 502.
    const response = await request.get(`${BASE_URL}/api/supabase/rest/v1/properties?limit=1`, {
      headers: {
        'apikey': 'dummy-key-safe-from-browsers'
      }
    })

    expect([401, 404]).toContain(response.status())
    const body = await response.json()
    expect(['42501', 'PGRST205']).toContain(body.code)
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

import { test, expect } from '@playwright/test'

test.describe('Auditoría de Seguridad - Evasión de Proxy y Anon Key', () => {
  test('debería bloquear el acceso directo a Supabase con la clave dummy (Evasión Bloqueada)', async ({ request }) => {
    // Intentar consultar directamente el endpoint real de Supabase usando la clave dummy del cliente
    const response = await request.get('https://tohjzoncoosvjbjcakdl.supabase.co/rest/v1/properties', {
      headers: {
        'apikey': 'dummy-key-safe-from-browsers'
      }
    })

    // La base de datos debe rechazar la conexión con 401 ya que la clave real no está expuesta
    expect(response.status()).toBe(401)
  })

  test('debería permitir acceso legítimo a través del proxy local', async ({ request }) => {
    // Consultar a través de la ruta proxy, la cual inyecta la clave real del lado del servidor
    const response = await request.get('http://localhost:5173/api/supabase/rest/v1/properties?limit=1', {
      headers: {
        'apikey': 'dummy-key-safe-from-browsers'
      }
    })

    // El proxy local reescribe las cabeceras correctamente, por lo que debe devolver 200 OK
    expect(response.status()).toBe(200)
  })
})

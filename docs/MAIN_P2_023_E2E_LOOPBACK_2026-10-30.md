# MAIN-P2-023 — aislar destinos de pruebas E2E

Fecha: 2026-10-30  
Estado: remediación implementada en rama; pendiente CI e integración en `main`.  
Alcance: configuración Playwright y pruebas E2E; sin solicitudes a DEV/producción.

## Hallazgo

En `origin/main`, `security.spec.ts` resolvía la URL Supabase hasta el endpoint de
producción cuando no había override. Ejecutar la suite genérica disparaba una
solicitud externa incluso con la app local.

## Cambio

- Playwright usa `127.0.0.1:5174` por defecto y el servidor Vite arranca en ese
  puerto, salvo que se proporcione explícitamente un servidor externo.
- Los probes de seguridad apuntan a Supabase loopback (`127.0.0.1:54321`) por
  defecto y tienen una guardia propia que no acepta destinos alojados, incluso
  cuando el resto de Playwright se ejecuta con opt-in de nube.
- Destinos remotos requieren `CUBITAT_E2E_ALLOW_CLOUD=true`, HTTPS y el mismo
  ámbito local/alojado para app y Supabase. La opción no desactiva guardias más
  estrictas de cada spec.
- Los flujos de publicación, mensajería y alertas que pueden escribir datos
  verifican app y Supabase loopback justo antes del primer request. Quitados los
  fallbacks a la URL Supabase productiva.
- Documentada la configuración y actualizada la especificación de seguridad.

## Evidencia local

- `npm run lint`: PASS.
- `npm run test:run`: 154 archivos; 677 PASS, 1 SKIP.
- `SITEMAP_MODE=static npm run build`: PASS, incluidos verificadores de bundles.
- `npx playwright test e2e/security.spec.ts --list` con configuración por
  defecto: enumeró 4 casos, sin iniciar servidor ni enviar solicitudes.
- Mismo listado con app y Supabase hosted sin opt-in: falla durante la carga de
  config antes de ejecutar tests.
- Con opt-in de nube, el spec de seguridad también falla durante la carga por
  estar fijado a loopback.
- Sin ejecución de los E2E contra Supabase local/hosted; no hubo escrituras ni
  tráfico a Cubitat DEV/producción.

## Pendiente

- CI verde y merge del PR.
- No marcar el comportamiento hosted como verificado: no se ejecutó ningún
  flujo contra proveedor remoto.

# MAIN-P2-005 — límites de cuerpos HTTP del Worker

Fecha: 2026-10-30 (CDMX)  
Estado: integrado en `main` por PR #176, merge `7451a17bfb01e000d7af360d7df3fed5d188fb52`. Pasaron `quality` y `database-security` del PR y el CI post-merge de `main` (run `41169103539`). No desplegada.

## Cambio

- Nuevo lector `readBoundedBytes` / `readBoundedText` / `readBoundedJsonObject`: valida `Content-Length` si existe, cuenta bytes reales del stream, cancela al superar el límite o tras 30 segundos sin finalizar, y responde `413` o `408`.
- Contacto y reportes públicos: máximo 16 KiB antes de Turnstile/RPC.
- Push: autentica primero, limita el JSON a 8 KiB y añade tope de 30 solicitudes/minuto por IP en el router.
- Reenvío de confirmación: 4 KiB; lectura de email/password de Auth y PATCH de perfil: 16 KiB; métricas de contacto y RPC de duplicado: 1 KiB y 4 KiB respectivamente.
- Moderación IA autentica y aplica su rate limit antes de parsear, con máximo de 8 MiB.
- El proxy Supabase verifica bytes reales antes de upstream: 64 KiB por defecto, 5 MiB para `property_images`, 1 MiB para `avatars` y 10 MiB para `kyc_documents` / `property_documents`.
- Añadida especificación de seguridad y pruebas para cancelación, timeout, cuerpos sin `Content-Length`, rechazo previo a upstream y límites por bucket.

## Validación local

- Pruebas focales Worker: 90/90 PASS.
- `npm run lint`: PASS.
- Suite completa: 155 archivos, 692 PASS, 1 SKIP.
- `SITEMAP_MODE=static npm run build`: PASS, incluidos TypeScript, bundle production/Worker/secretos y sitemap estático.
- El build mantiene advertencias existentes de chunk MapLibre >500 kB, `__dirname` de Vite y `inlineDynamicImports` de PWA.
- No se enviaron cargas de estrés; pruebas locales usan mocks/streams. No se midió memoria o CPU en Workers hosted ni se comprobó el plan/límite real de la zona.

## Límite operativo

Sin llamadas a Supabase/Cloudflare hosted ni deploy. La reconciliación híbrida de migraciones sigue siendo el gate para desplegar Worker/UI en cualquier entorno alojado. Revisar `wrangler.toml` y las cuotas Storage desplegadas cuando se levante el gate; los límites de bucket aquí usan las migraciones versionadas, no una lectura del esquema hosted.

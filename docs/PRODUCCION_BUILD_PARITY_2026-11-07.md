# Producción: paridad de build de main — 2026-11-07

## Resultado

Se publicó en Cloudflare Workers el build limpio de `origin/main` (`9a176e1971663a8826f88fb152303a93b6644792`) para `cubitat1`, que atiende `cubitathome.com` y `www.cubitathome.com`.

- Versión Worker: `23f40b8f-3eae-4032-9d6b-7b01d456862a`, 100% activo.
- Build: `npm run build:phase4-production`; sitemap dinámico con 446 URLs.
- Guards PASS: Phase 2, Phase 3, Phase 4, Worker y secretos privados.
- Lint PASS.
- Vitest PASS con variables públicas de build retiradas: 196 archivos, 881 PASS, 1 SKIP. La primera ejecución heredó `VITE_SUPABASE_URL` de build y falló un test que exige aislar la URL; al ejecutar con entorno limpio pasó.
- CI post-merge `42365860673` PASS.
- Smoke en producción: `/`, `/postular-agente`, `/panel-agente`, `/servicios`, `/materiales`, `/resultados`, `/moderar` y los seis assets principales respondieron HTTP 200.
- Configuración Worker conservó `PHASE3_ENABLED=true`, flags Phase 2 y cron `* * * * *`.

## Alcance y pendientes

Esto verifica que los assets servidos corresponden al build de main. No reemplaza QA autenticado de postulante/moderador AAL2, correo real ni purga de documentos; F3 no se declara funcionalmente cerrada hasta completar esas verificaciones. No se enviaron postulaciones ni correos y no se modificó Supabase en este despliegue.

# MAIN-P2-002 — guard para despliegues manuales

Fecha: 2026-10-30  
Estado: integrado en `main` mediante PR #158, merge `87b08685f3563411a046e4a0d77fbb6912d676ac`; CI de calidad y seguridad SQL PASS.  
Cloudflare remoto, Worker y Supabase: sin cambios ni despliegues.

## Cambio

- `npm run deploy` ejecuta lint, suite, `build:phase2-production`, confirmación
  interactiva con `DEPLOY PRODUCTION` y Wrangler con `wrangler.jsonc`, en ese
  orden.
- `npm run cf:deploy` delega al mismo guard.
- `npm run deploy:phase2-dev` usa la suite, `build:phase2-dev`, confirmación
  `DEPLOY DEV` y `wrangler.phase2-dev.jsonc`.
- La confirmación falla cerrada fuera de una terminal interactiva, ante destino
  desconocido o cuando la frase no coincide.
- Las guías manuales y las instrucciones tras rotar secretos apuntan a esos
  scripts. Cloudflare Builds mantiene su secuencia configurada build → deploy;
  este trabajo no cambió su configuración remota.

## Validación local

- Pruebas del guard: 3/3 PASS; comprueban orden de comandos y rechazo de
  ejecución no interactiva/destino inválido.
- `npm run lint`: PASS.
- `npm run test:run`: 153 archivos, 670 PASS, 1 SKIP.
- `SITEMAP_MODE=static npm run build`: PASS.
- Builds adicionales `build:phase2-production` y `build:phase2-dev`: PASS con
  URLs Supabase de cada entorno y claves públicas sintéticas no válidas. Los
  verificadores de bundles pasaron. No se usaron credenciales ni se desplegó.
- `git diff --check`: PASS.

El wrapper es el camino manual recomendado; `wrangler deploy` directo sigue
siendo técnicamente invocable y debe reservarse para el paso de Deploy de
Cloudflare Builds, que corre después de su Build command. No se verificó la
configuración del Dashboard de Cloudflare durante este cambio.

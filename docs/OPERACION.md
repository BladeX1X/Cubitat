# Operacion Cubitat

Guia corta para desplegar, validar y operar Cubitat en produccion.

Documentacion relacionada:

- [Despliegue completo](./DESPLIEGUE_COMPLETO.md): guia desde GitHub hasta produccion con Cloudflare, Supabase, Groq, Resend, Google Analytics, Search Console y PWA.
- [PWA](./PWA.md): instalacion, service worker, cache, offline/update prompts y checklist.

## Despliegue

Desde `web/`:

```bash
npm run cf:deploy
```

Ese comando ejecuta:

```bash
npm run build
wrangler deploy
```

Antes de desplegar cambios de base de datos, aplicar migraciones:

```bash
supabase db push --linked --dry-run
supabase db push --linked --yes
```

## Validacion Rapida

Desde `web/`:

```bash
npm run lint
npm run test:run
npm run test:e2e -- e2e/security.spec.ts
npm run build
```

Validacion manual recomendada en `/publicar`:

- En el paso 1, el mapa no debe cargarse antes de seleccionar provincia y municipio.
- Al seleccionar municipio, el mapa debe abrir automaticamente centrado en ese municipio.
- Al cambiar provincia o municipio, las coordenadas marcadas deben limpiarse para evitar guardar una ubicacion vieja.
- La seccion del mapa no debe mostrar texto de "opcional" ni boton manual de abrir mapa.

## Tests E2E Reales

Prueba el flujo completo de publicacion contra Supabase real.

### Variables de entorno requeridas

```bash
CUBITAT_E2E_EMAIL=usuario@ejemplo.com
CUBITAT_E2E_PASSWORD=contraseña
VITE_SUPABASE_ANON_KEY=eyJ...              # Del .env (nunca commiteada)
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # Opcional, para limpieza automatica
```

Sin `CUBITAT_E2E_EMAIL` y `CUBITAT_E2E_PASSWORD` el test se salta automaticamente.

### Ejecutar

```bash
cd web
npm run test:e2e:real
```

### Que valida

1. Login real contra Supabase Auth.
2. Recorre los 8 pasos del asistente de publicacion.
3. Verifica que la propiedad queda en `pending_review`.
4. Verifica que **no** aparece en `/resultados` (solo se muestran `published`).
5. Limpieza automatica de la propiedad creada.

### Seguridad

- Las credenciales se leen de variables de entorno, nunca del codigo.
- No commitees `.env` ni claves.
- La cuenta usada debe tener `enable_confirmations = false` o estar confirmada.

Validar produccion despues de deploy:

```powershell
curl.exe -I https://cubitathome.com/
curl.exe -I https://cubitathome.com/resultados
curl.exe -I https://cubitathome.com/publicar
curl.exe -I https://cubitathome.com/moderar
```

Validar endpoints internos con token invalido:

```powershell
$body = @{ property_id = '00000000-0000-0000-0000-000000000000'; title = 'test'; location = 'Cuba'; description = 'test'; price_usd = 1; property_type = 'casa'; images = @() } | ConvertTo-Json -Compress
try { Invoke-RestMethod -Uri 'https://cubitathome.com/api/ai-moderate' -Method Post -ContentType 'application/json' -Headers @{ Authorization = 'Bearer invalid-test-token' } -Body $body -TimeoutSec 20 } catch { [int]$_.Exception.Response.StatusCode }
try { Invoke-RestMethod -Uri 'https://cubitathome.com/api/metrics' -Method Get -Headers @{ Authorization = 'Bearer invalid-test-token' } -TimeoutSec 20 } catch { [int]$_.Exception.Response.StatusCode }
```

Resultado esperado: `401` en ambos.

## Moderacion

Flujo esperado:

1. Usuario publica desde `/publicar`.
2. La propiedad queda en `pending_review`.
3. La propiedad no aparece en `/resultados`.
4. Admin entra en `/moderar`.
5. Admin aprueba la propiedad para pasarla a `published`.
6. La propiedad aparece en `/resultados`.

Estados relevantes:

- `pending_review`: pendiente de revision.
- `ai_approved`: aprobada por IA, no publica por si sola.
- `ai_rejected`: rechazada por IA.
- `published`: visible publicamente.
- `paused`: oculta/rechazada manualmente.

## Tareas Pendientes

### Envio automatico de alertas de busqueda

El flujo esta implementado y aislado en el Worker de Fase 2 DEV. Las alertas se
guardan en `public.search_alerts` con RLS por usuario; una propiedad publicada
coincidente crea una notificacion pendiente y el Cron DEV reclama el lote con
`claim_pending_alert_emails`.

El dispatcher exige `PHASE2_ENABLED=true` antes de iniciar cualquier acceso
externo. Cuando esta bandera no esta activa devuelve un resumen vacio sin
consultar Supabase ni Resend. Con Fase 2 habilitada, requiere la clave de
servicio de Supabase, `RESEND_API_KEY`, `PUBLIC_SITE_URL` y `ALERT_EMAIL_FROM`;
si falta cualquiera, no reclama ni envia alertas. Cuando la configuracion esta
completa, envia mediante Resend con clave de idempotencia, escapa el HTML,
marca `sent` solo despues de una respuesta exitosa y reintenta hasta tres veces
antes de marcar `failed`. Si falta configuracion server-side, no toca datos y
degrada de forma segura; nunca usa el remitente productivo como fallback en
DEV.

Estado operativo:

- Verificado en codigo y pruebas unitarias del dispatcher.
- Ejecutado por el Cron de `cubitat1-phase2-dev` junto con Push y retencion KYC.
- La prueba real de entrega depende de `RESEND_API_KEY` y un destinatario DEV;
  no se considera evidencia de produccion.
- Produccion no ejecuta este dispatcher mientras Fase 2 permanezca aislada.

Variables/servicios involucrados:

- Supabase: tabla `search_alerts`, propiedades publicadas, notificaciones y usuarios.
- Cloudflare Workers: job programado y variables secretas.
- Resend: envio transaccional server-side.
- Google Analytics: evento opcional `search_alert_email_sent` sin datos personales.

## Seguridad

Nunca commitear:

- `.env`
- `.dev.vars`
- service role keys
- tokens de Cloudflare/Supabase/Google
- scripts locales con credenciales embebidas

Si una key aparece en texto plano, rotarla inmediatamente en el proveedor.

La `service_role key` de Supabase solo debe usarse en tooling local o backend confiable, nunca en frontend ni en repositorio.

## Checklist Antes De Commit

```bash
git status --short
git diff --stat
git diff --cached --stat
```

No mezclar en un mismo commit:

- Cambios de seguridad.
- Cambios visuales/SEO.
- Cambios de migraciones.
- Scripts locales o pruebas de carga.

## Rollback

Para volver a una version anterior del Worker:

```bash
npx wrangler versions list
npx wrangler rollback
```

Para cambios de base de datos, no usar rollback destructivo sin revisar datos. Crear una migracion correctiva.

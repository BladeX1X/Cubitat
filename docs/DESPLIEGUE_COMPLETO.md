# Despliegue Completo De Cubitat

Guia paso a paso para tomar el codigo desde GitHub y dejar Cubitat desplegado en produccion con Cloudflare, Supabase, Groq, Resend, Google Analytics y Search Console.

Dominio canonico actual del proyecto:

```txt
https://cubitathome.com
```

Repositorio:

```txt
https://github.com/BladeX1X/Cubitat
```

Aplicacion principal:

```txt
web/
```

## 1. Requisitos Locales

Instalar:

- Node.js compatible con el proyecto.
- npm.
- Git.
- Supabase CLI.
- Wrangler CLI, incluido como dependencia del proyecto.
- Cuenta Cloudflare con acceso al dominio.
- Cuenta Supabase.
- Cuenta Groq.
- Cuenta Resend.
- Google account con acceso a Analytics y Search Console.

Comprobar:

```powershell
git --version
node --version
npm --version
```

## 2. Clonar Y Preparar El Repo

```powershell
git clone https://github.com/BladeX1X/Cubitat.git
cd Cubitat\web
npm install
```

Crear variables locales:

```powershell
Copy-Item .env.example .env
```

Completar `web/.env` con valores reales:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
VITE_PUBLIC_SITE_URL=https://cubitathome.com
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

No commitear `.env`, `.dev.vars`, service role keys ni tokens.

Validar local:

```powershell
npm run dev
```

Abrir:

```txt
http://127.0.0.1:5173
```

## 3. Supabase

Cubitat usa Supabase para:

- Auth.
- Base de datos.
- Storage de imagenes.
- Realtime/notificaciones.
- RLS y politicas de seguridad.

### 3.1 Crear Proyecto

En Supabase crear un proyecto. Guardar:

```txt
Project URL
Anon public key
Project ref
Service role key, solo para tooling local/backend confiable
```

El proyecto actual documentado usa:

```txt
Project ref: tohjzoncoosvjbjcakdl
```

### 3.2 Enlazar CLI

Desde `web/`:

```powershell
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
```

### 3.3 Aplicar Migraciones

Revisar primero:

```powershell
npx supabase db push --linked --dry-run
```

Aplicar:

```powershell
npx supabase db push --linked --yes
```

Las migraciones viven en:

```txt
web/supabase/migrations/
```

### 3.4 Auth URLs

En Supabase Dashboard:

```txt
Authentication > URL Configuration
```

Configurar:

```txt
Site URL:
https://cubitathome.com

Redirect URLs:
https://cubitathome.com/auth/callback
https://cubitathome.com/recuperar-contrasena
http://127.0.0.1:5173/auth/callback
http://127.0.0.1:5173/recuperar-contrasena
```

### 3.5 Storage

Confirmar que exista el bucket usado por el flujo de publicacion:

```txt
property_images
```

El frontend sube imagenes WebP y guarda URLs publicas en `properties.images` y `properties.cover_image`.

### 3.6 Google OAuth Con Supabase

En Google Cloud Console crear OAuth Client:

```txt
Type: Web application
```

Authorized JavaScript origins:

```txt
http://127.0.0.1:5173
https://cubitathome.com
```

Authorized redirect URI:

```txt
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

En Supabase:

```txt
Authentication > Sign In / Providers > Google
```

Pegar:

```txt
Client ID
Client Secret
```

Mas detalle:

```txt
docs/OAuth-Google-Supabase.md
```

## 4. Resend Para Correos

Cubitat usa Resend como SMTP para Supabase Auth:

- Confirmacion de cuenta.
- Recuperacion de contrasena.
- Aviso de contrasena cambiada.

### 4.1 Crear Dominio En Resend

Recomendado:

```txt
cubitathome.com
```

Si se usa otro dominio, mantener consistencia con el remitente.

Crear/verificar dominio desde Resend o CLI:

```powershell
npx --yes resend-cli@latest login
npx --yes resend-cli@latest domains list --json
```

### 4.2 Agregar DNS

En Cloudflare DNS agregar los registros que entregue Resend:

- DKIM TXT.
- SPF/Mail From MX.
- SPF/Mail From TXT.
- DMARC TXT recomendado.

Hay una referencia previa en:

```txt
docs/DNS-Resend-Cubitat.md
```

Nota: ese documento menciona `cubitat.com`. Para produccion actual, revisar si el dominio final sera `cubitathome.com` o `cubitat.com` y no mezclar remitentes.

### 4.3 Verificar Dominio

```powershell
npx --yes resend-cli@latest domains verify <DOMAIN_ID>
npx --yes resend-cli@latest domains get <DOMAIN_ID> --json
```

Debe quedar:

```txt
verified
```

### 4.4 Configurar SMTP En Supabase

En Supabase:

```txt
Project Settings > Authentication > SMTP Settings
```

Configurar:

```txt
Host: smtp.resend.com
Port: 465
Username: resend
Password: RESEND_API_KEY
Sender name: Cubitat
Sender email: notificaciones@cubitathome.com
```

No activar SMTP con dominio no verificado.

## 5. Groq Para Moderacion IA

Cubitat usa Groq en el Worker para `/api/ai-moderate`.

Endpoint:

```txt
web/src/worker.ts
```

Modelo configurado:

```txt
meta-llama/llama-4-scout-17b-16e-instruct
```

Si `GROQ_API_KEY` no existe, el Worker deja la propiedad en:

```txt
pending_review
```

y requiere revision manual.

### 5.1 Crear API Key

En Groq Console crear una API key y guardarla en un gestor seguro.

### 5.2 Configurar Secreto En Cloudflare

Desde `web/`:

```powershell
npx wrangler secret put GROQ_API_KEY
```

Pegar la key cuando Wrangler la pida. No ponerla en `wrangler.jsonc`.

## 6. Cloudflare Workers

Cubitat se despliega como Cloudflare Worker con assets de Vite.

Archivo:

```txt
web/wrangler.jsonc
```

Define:

```txt
main = src/worker.ts
assets.directory = ./dist/
assets.not_found_handling = single-page-application
routes = cubitathome.com/* y www.cubitathome.com/*
```

### 6.1 Login

```powershell
cd web
npx wrangler login
```

### 6.2 Variables Publicas

En `wrangler.jsonc` o en Cloudflare Dashboard configurar:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Estas son publicas para el frontend, pero no deben confundirse con `service_role`.

### 6.3 Secretos Del Worker

Configurar solo los que se usen:

```powershell
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put CF_API_TOKEN
npx wrangler secret put CF_ACCOUNT_ID
npx wrangler secret put SUPABASE_MANAGEMENT_TOKEN
npx wrangler secret put SUPABASE_PROJECT_ID
npx wrangler secret put GA_SERVICE_ACCOUNT_JSON
```

Notas:

- `GROQ_API_KEY`: moderacion IA.
- `CF_API_TOKEN` y `CF_ACCOUNT_ID`: metricas Cloudflare en `/api/metrics`.
- `SUPABASE_MANAGEMENT_TOKEN` y `SUPABASE_PROJECT_ID`: reservado para metricas/gestion Supabase.
- `GA_SERVICE_ACCOUNT_JSON`: reservado para integrar metricas GA por servidor.

### 6.4 Deploy Manual

Desde `web/`:

```powershell
npm run build
npx wrangler deploy
```

O:

```powershell
npm run cf:deploy
```

### 6.5 Deploy Desde GitHub

En Cloudflare conectar:

```txt
Repository: BladeX1X/Cubitat
Root directory: web
Build command: npm run build
Deploy command: npx wrangler deploy
```

Confirmar rutas:

```txt
cubitathome.com/*
www.cubitathome.com/*
```

El Worker redirige HTTP a HTTPS y `www` al dominio raiz.

## 7. DNS En Cloudflare

En Cloudflare DNS:

```txt
A/AAAA/CNAME segun configuracion del Worker o ruta asignada
```

Si se usa Workers Routes, confirmar que:

```txt
cubitathome.com/*
www.cubitathome.com/*
```

esten asociadas al Worker.

DNS adicional:

- Registros de Resend.
- Registros de Google Search Console si se verifica por TXT.
- Registros de Auth custom domain si se configura `auth.cubitathome.com`.

## 8. Google Analytics

Cubitat soporta GA4 con:

```txt
VITE_GA_MEASUREMENT_ID
```

Archivo:

```txt
web/src/shared/lib/analytics.ts
```

### 8.1 Crear Propiedad GA4

En Google Analytics:

```txt
Admin > Create property > Web stream
```

URL:

```txt
https://cubitathome.com
```

Copiar Measurement ID:

```txt
G-XXXXXXXXXX
```

### 8.2 Configurar Variable

En `.env` local:

```env
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

En Cloudflare:

```txt
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Luego redeploy.

### 8.3 Validar

Abrir produccion y revisar:

```txt
Google Analytics > Reports > Realtime
```

La app es SPA; el codigo envia `page_view` cuando cambia la ruta interna.

## 9. Google Search Console

### 9.1 Crear Propiedad

En Search Console crear propiedad de dominio:

```txt
cubitathome.com
```

Verificar preferiblemente por DNS TXT en Cloudflare.

### 9.2 Sitemap

El build genera:

```txt
https://cubitathome.com/sitemap.xml
https://cubitathome.com/robots.txt
```

Regenerar sitemap:

```powershell
cd web
npm run seo:sitemap
npm run build
```

Enviar en Search Console:

```txt
sitemap.xml
```

No incluir rutas privadas en sitemap:

```txt
/mi-cuenta
/favoritos
/mis-propiedades
/editar
/auth/callback
/recuperar-contrasena
```

## 10. PWA

Cubitat usa `vite-plugin-pwa`.

Archivos principales:

```txt
web/vite.config.ts
web/src/components/layout/PWAInstallPrompt.tsx
web/src/vite-env.d.ts
docs/PWA.md
```

Validar despues de deploy:

1. Abrir `https://cubitathome.com`.
2. Verificar manifest en DevTools.
3. Verificar service worker activo.
4. Probar instalacion en Chrome/Android.
5. Probar iOS Safari: compartir > Agregar a pantalla de inicio.
6. Probar aviso offline/online.
7. Probar actualizacion con dos deploys consecutivos.

## 11. Validacion Antes De Subir

Desde `web/`:

```powershell
npm run lint
npm run test:run
npm run build
```

Pruebas E2E opcionales:

```powershell
npm run test:e2e
```

Prueba real de publicacion requiere variables:

```env
CUBITAT_E2E_EMAIL=
CUBITAT_E2E_PASSWORD=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Ejecutar:

```powershell
npm run test:e2e:real
```

## 12. Publicar Cambios A Main

Desde la raiz del repo:

```powershell
git status --short
git diff --stat
git add .
git commit -m "docs: add deployment runbook"
git pull --rebase origin main
git push origin main
```

Cloudflare debe desplegar automaticamente si esta conectado a GitHub.

## 13. Validacion Post Deploy

Comprobar HTTP:

```powershell
curl.exe -I https://cubitathome.com/
curl.exe -I https://cubitathome.com/resultados
curl.exe -I https://cubitathome.com/publicar
curl.exe -I https://cubitathome.com/moderar
curl.exe -I https://www.cubitathome.com/
```

Esperado:

- `https://cubitathome.com/`: 200.
- rutas SPA: 200.
- `www`: 301 hacia raiz.
- HTTP: 301 hacia HTTPS.

Validar app:

1. Registro con email.
2. Confirmacion de correo.
3. Recuperacion de contrasena.
4. Login normal.
5. Login Google.
6. Buscar propiedades.
7. Abrir detalle.
8. Guardar favorito.
9. Publicar propiedad.
10. Subir imagenes.
11. Mapa de publicacion: aparece despues de provincia y municipio.
12. Moderacion IA: propiedad pasa a `ai_approved`, `ai_rejected` o `pending_review`.
13. Admin puede aprobar/publicar.
14. Propiedad publicada aparece en `/resultados`.

Validar endpoints internos con token invalido:

```powershell
$body = @{ property_id = '00000000-0000-0000-0000-000000000000'; title = 'test'; location = 'Cuba'; description = 'test'; price_usd = 1; property_type = 'casa'; images = @() } | ConvertTo-Json -Compress
try { Invoke-RestMethod -Uri 'https://cubitathome.com/api/ai-moderate' -Method Post -ContentType 'application/json' -Headers @{ Authorization = 'Bearer invalid-test-token' } -Body $body -TimeoutSec 20 } catch { [int]$_.Exception.Response.StatusCode }
try { Invoke-RestMethod -Uri 'https://cubitathome.com/api/metrics' -Method Get -Headers @{ Authorization = 'Bearer invalid-test-token' } -TimeoutSec 20 } catch { [int]$_.Exception.Response.StatusCode }
```

Esperado:

```txt
401
401
```

## 14. Checklist De Produccion

- GitHub repo actualizado en `main`.
- `npm run build` pasa.
- Supabase migraciones aplicadas.
- Supabase Auth URLs configuradas.
- Supabase Storage `property_images` listo.
- RLS activo y probado.
- Resend dominio verificado.
- Supabase SMTP con Resend activo.
- Google OAuth activo en Supabase.
- Cloudflare Worker desplegado.
- Rutas `cubitathome.com/*` y `www.cubitathome.com/*` activas.
- `GROQ_API_KEY` configurada como secret.
- `VITE_GA_MEASUREMENT_ID` configurada.
- Search Console verificado por DNS.
- `sitemap.xml` enviado.
- PWA instalable.
- `robots.txt` apunta al sitemap.
- No hay secretos en git.

## 15. Operacion Y Rollback

Ver logs de Cloudflare:

```powershell
npx wrangler tail
```

Listar versiones:

```powershell
npx wrangler versions list
```

Rollback:

```powershell
npx wrangler rollback
```

Para base de datos, no usar rollback destructivo. Crear una migracion correctiva.

## 16. Archivos De Referencia

```txt
docs/OPERACION.md
docs/PWA.md
docs/Cloudflare-Workers-Deploy.md
docs/Google-Indexacion-y-Analytics.md
docs/OAuth-Google-Supabase.md
docs/ADR-001-Email-Provider.md
docs/DNS-Resend-Cubitat.md
web/wrangler.jsonc
web/vite.config.ts
web/src/worker.ts
web/supabase/config.toml
web/supabase/migrations/
web/.env.example
```

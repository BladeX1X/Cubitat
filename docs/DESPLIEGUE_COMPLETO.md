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

#### 3.3.1 Contingencia de CLI

Si la CLI no funciona, corregir primero el entorno o seguir una ventana de
mantenimiento supervisada. La ejecucion manual debe usar exactamente los SQL
versionados, en orden cronologico, y reconciliar el historial de migraciones.
Consultar `web/supabase/DATABASE_MIGRATIONS.md` antes de actuar.

Las migraciones productivas con allowlist propia se ejecutan únicamente desde
su workflow `workflow_dispatch` en `main`, nunca desde una copia local del
repositorio. Para coordenadas privadas de Servicios y Materiales, usar
`Apply publication coordinates migration to production` después de integrar
la migración revisada. Para el ajuste de municipio `20261128120000`, el workflow
exige la frase `APPLY PUBLICATION COORDINATES TO PRODUCTION WITHOUT BACKUP`,
conforme a la autorización expresa del propietario. No genera respaldo; valida
el proyecto, las 174 versiones registradas y sus fuentes, el estado previo, el
checksum, el dry-run de una sola versión y los grants/seguridad de las RPC al
terminar. Ejecutar solo desde `main`; desplegar el Worker después de verificar
el postcheck de base de datos.

Ejecución del 2026-11-28: PR #301 se integró en `main` (merge
`89001ba1198adbfe6d2430e2d5cf0b402af2c3c8`); el workflow de migración
[46176314587](https://github.com/BladeX1X/Cubitat/actions/runs/46176314587)
aplicó `20261128120000` y pasó sus verificaciones. Luego el Worker `cubitat1`
versión `f80cf97d-9159-4e77-ab34-c7df4e070564` quedó al 100 %. Smoke público:
Inicio, resultados, Servicios, Materiales y formulario de Materiales HTTP 200.
Queda pendiente el recorrido autenticado de creación/edición en Producción.

No crear politicas alternativas de insercion publica para `contacts` ni
`property_reports`: el flujo vigente exige Turnstile en el Worker y RPC
exclusivas de `service_role`. El antiguo bloque SQL de esta guia fue retirado
porque contradecia esa frontera.

#### 3.3.2 Migración productiva puntual de cobertura pHash

La cobertura pHash se amplía mediante una migración numerada. El workflow
manual `Apply production pHash coverage migration` solo se ejecuta desde `main`
y solo aplica `20261013110000` si el dry-run confirma que es la única migración
pendiente en el proyecto productivo `tohjzoncoosvjbjcakdl`. Usa el secreto
`SUPABASE_DB_URL` de GitHub Actions; no ejecutar `db push --linked` desde un
checkout conectado a DEV para este fin. Ejecutado el 2026-10-13 en el workflow
38366110447; el dry-run confirmó que era la única pendiente y el historial
remoto quedó verificado.

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

### 3.7 Pantalla de Consentimiento y Verificación de Marca (Google OAuth)

Para evitar la pantalla de advertencia roja de "Aplicación no verificada" de Google y mostrar la marca oficial "Cubitat" en el consentimiento de inicio de sesión:

1.  **Configurar Pantalla de Consentimiento**:
    *   En Google Cloud Console, accede a **APIs & Services > OAuth consent screen**.
    *   Define el **App name** como `Cubitat`.
    *   Define el **User support email** y **Developer contact info** con correos administradores del proyecto.
    *   En **Authorized domains**, añade:
        *   `cubitathome.com`
        *   `supabase.co`
2.  **Definir Scopes**:
    *   Agrega los scopes mínimos para lectura de perfil y correo: `.../auth/userinfo.email`, `.../auth/userinfo.profile` y `openid`.
3.  **Pasar a Producción (Paso Crítico)**:
    *   Por defecto, el proyecto inicia en estado *Testing*. Bajo la sección **Publishing status**, haz clic en **Publish App** y confirma para pasarla a **In Production**. Esto elimina la restricción que limita el inicio de sesión a usuarios de prueba configurados a mano.
4.  **Verificación de Logotipo (Opcional para MVP)**:
    *   Subir un logotipo de marca requiere que Google verifique manualmente tu dominio y políticas de privacidad (lo que toma entre 3 y 7 días). Para el lanzamiento inicial, puedes dejar el logotipo vacío; Google permitirá el inicio de sesión productivo sin advertencias rojas de peligro, mostrando el nombre de texto "Cubitat" de forma segura.


### 3.8 Estructura de Seguridad y Políticas RLS (Row Level Security)

Para garantizar la protección de datos sensibles e impedir que usuarios manipulen registros ajenos, Supabase debe configurar las siguientes políticas RLS (código SQL contenido en `supabase/migrations/`):

#### 1. Tabla `profiles` (Perfiles de Usuario)

> Fase 2, solo DEV: estas reglas están en `supabase/dev-migrations/20260801000000_phase2_kyc_and_agents.sql`. No forman parte del esquema productivo y no deben desplegarse todavía.
*   **Seguridad**: RLS habilitado.
*   **Políticas**:
    *   `Lectura (SELECT)`: propietario o administrador con AAL2; la vista profesional pública usa el RPC mínimo.
    *   `Actualización propia (UPDATE)`: solo campos ordinarios del perfil; rol, teléfono verificado y KYC están protegidos por trigger.

#### 2. Tabla `properties` (Inmuebles)
*   **Seguridad**: RLS habilitado.
*   **Políticas**:
    *   `Lectura pública (SELECT)`: Permitida para cualquier usuario únicamente si el anuncio tiene el estado `status = 'published'`.
    *   `Lectura privada de borradores/revisiones (SELECT)`: solo el propietario del anuncio (`user_id = auth.uid()`) o un administrador con sesión AAL2.
    *   `Creación (INSERT)`: Permitido para cualquier usuario autenticado. El sistema inserta y vincula obligatoriamente el registro con el ID del creador (`owner_id = auth.uid()`).
    *   `Modificación/Eliminación (UPDATE/DELETE)`: propietario para sus transiciones permitidas o administrador con AAL2 para moderación. `owner_hidden` y `paused` son controles independientes.

#### 3. Tabla `property_images` (Galería de Fotos)
*   **Seguridad**: RLS habilitado.
*   **Políticas**:
    *   `Lectura (SELECT)`: Pública para todos.
    *   `Escritura/Borrado (INSERT/DELETE)`: Solo permitida si el usuario autenticado es el propietario de la propiedad relacionada (`property_id` apunta a una propiedad cuyo `owner_id = auth.uid()`).

#### 4. Tabla `contacts` (Prospectos y Leads)
*   **Seguridad**: RLS habilitado.
*   **Políticas**:
    *   `Creación (INSERT)`: no se permite directamente desde el cliente. El Worker valida Turnstile y usa el RPC exclusivo de `service_role`.
    *   `Lectura (SELECT)`: Restringido únicamente al anunciante dueño de la propiedad (`owner_id = auth.uid()`) y a los administradores para labores de control de spam.

#### 5. Tabla `saved_properties` (Favoritos)
*   **Seguridad**: RLS habilitado.
*   **Políticas**:
    *   `Lectura/Escritura/Borrado (ALL)`: Restringido en su totalidad para que solo el propietario de la lista (`user_id = auth.uid()`) pueda ver o modificar sus favoritos. Ningún usuario puede ver favoritos de otros.


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

### 4.5 Configuración de Recepción y Enrutamiento de Correos (Cloudflare Email Routing + Gmail)

Para centralizar la comunicación en una sola bandeja de entrada gratuita, se ha configurado **Cloudflare Email Routing** para recibir correos en `soporte@cubitathome.com` y redirigirlos a `pochiprats@gmail.com`, así como el envío manual desde Gmail utilizando la infraestructura SMTP de Resend.

#### 4.5.1 Configuración de la Recepción (Email Routing)
El enrutamiento de correo está activo y configurado con las siguientes reglas en Cloudflare:
*   **Destino Verificado**: `pochiprats@gmail.com`
*   **Regla Activa**: `soporte@cubitathome.com` → `pochiprats@gmail.com`
    *   *Rule ID*: `a23e7eddc96b49f8a47b0d66c636bf4f`
    *   *Catch-all*: Desactivado (los correos dirigidos a cualquier otra dirección que no sea `soporte@` se descartan por seguridad).

#### 4.5.2 Comandos Wrangler utilizados para Email Routing
Para auditorías o modificaciones futuras, se pueden utilizar los siguientes comandos de Wrangler en la terminal:
```bash
# Verificar estado general de Email Routing
npx wrangler email routing settings cubitathome.com

# Crear/validar la dirección de destino
npx wrangler email routing addresses create pochiprats@gmail.com

# Crear regla de reenvío literal
npx wrangler email routing rules create cubitathome.com --name "soporte to Gmail" --match-type literal --match-field to --match-value soporte@cubitathome.com --action-type forward --action-value pochiprats@gmail.com --enabled true

# Listar reglas y configuraciones
npx wrangler email routing rules list cubitathome.com
```

#### 4.5.3 Registros DNS de Email en Cloudflare
Los siguientes registros DNS fueron publicados en Cloudflare y verificados por resolvers públicos (`1.1.1.1` y `8.8.8.8`):
1.  **Registros MX (Enrutamiento)**:
    *   `cubitathome.com MX route1.mx.cloudflare.net` (Prioridad: 11)
    *   `cubitathome.com MX route2.mx.cloudflare.net` (Prioridad: 53)
    *   `cubitathome.com MX route3.mx.cloudflare.net` (Prioridad: 2)
2.  **Registro SPF**:
    *   `cubitathome.com TXT "v=spf1 include:_spf.mx.cloudflare.net include:spf.resend.com ~all"` (Combina la seguridad de Cloudflare Email Routing y los envíos transaccionales de Resend).
3.  **Política DMARC (Prevención de Suplantación)**:
    *   `_dmarc.cubitathome.com TXT "v=DMARC1; p=none; rua=mailto:soporte@cubitathome.com"`

#### 4.5.4 Configurar Envío Manual como "soporte@cubitathome.com" en Gmail
Para enviar correos directamente desde la interfaz de Gmail haciéndose pasar por tu dominio, realiza la siguiente configuración:
1.  Entra a **Gmail** → **Configuración** → **Ver todos los ajustes**.
2.  Ve a la pestaña **Cuentas e importación**.
3.  En la sección *Enviar correo como*, haz clic en **Añadir otra dirección de correo electrónico**.
4.  Rellena la ventana flotante:
    *   **Nombre**: Cubitat Soporte
    *   **Dirección de correo**: `soporte@cubitathome.com`
    *   **Servidor SMTP**: `smtp.resend.com`
    *   **Puerto**: `465` (con SSL)
    *   **Usuario**: `resend`
    *   **Contraseña**: *Tu API Key de Resend*
5.  Gmail enviará un código de verificación a `soporte@cubitathome.com`. Como el redireccionamiento está activo, el código llegará a `pochiprats@gmail.com`. Introduce el código en la ventana flotante y confirma la vinculación.
6.  *(Opcional)*: Crea un filtro en Gmail para que los correos enviados a `soporte@cubitathome.com` nunca se marquen como spam.

## 5. Groq Para Moderacion IA

Cubitat usa Groq en el Worker para `/api/ai-moderate`.

Endpoint:

```txt
web/src/worker.ts
```

Modelo configurado:

```txt
qwen/qwen3.8-27b
```

El modelo anterior `qwen/qwen3.6-27b` fue retirado por Groq el 2026-09-14.
El modelo actual admite texto, JSON Object Mode y hasta tres imágenes por
solicitud.

Si `GROQ_API_KEY` no existe, el Worker deja la propiedad en:

```txt
pending_review
```

y requiere revision manual.

### 5.1 Crear API Key

En Groq Console crear una API key y guardarla en un gestor seguro.

### 5.2 Configurar Secreto En Cloudflare

Para la Fase 2 actual, el secreto debe configurarse únicamente en DEV desde
`web/` usando el archivo aislado del Worker:

```powershell
npx wrangler secret put GROQ_API_KEY --config wrangler.phase2-dev.jsonc
```

Pegar la key cuando Wrangler la pida. No ponerla en `wrangler.jsonc`.

Comprobar únicamente el nombre del secreto, sin leer su valor:

```powershell
npx wrangler secret list --config wrangler.phase2-dev.jsonc
```

No ejecutar este paso con `wrangler.jsonc` ni con la configuración productiva
hasta que la Fase 2 haya sido aprobada y exista autorización explícita para
promoverla.

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

### 6.2.1 Variables en el Entorno de Construcción (Build Variables)

Durante el proceso de compilación (`npm run build`), el compilador ejecuta el script `node scripts/generate-sitemap.mjs`. Este script realiza llamadas directas a la API de Supabase para recuperar la lista de propiedades públicas y construir el archivo `sitemap.xml` dinámicamente.

Para que la compilación no falle en entornos de integración continua (CI/CD) como GitHub Actions o el motor de build automático de Cloudflare Pages:

La salida es determinista: las rutas se ordenan por URL canonica y `lastmod`
proviene de `properties.updated_at`. Las rutas estaticas sin una fecha real
conocida omiten ese elemento opcional. Por tanto, dos builds con el mismo
inventario producen exactamente el mismo archivo y no generan diffs por la
fecha u orden de ejecucion.

1.  **Configurar Variables de Build**:
    *   En el dashboard de Cloudflare, ve a tu proyecto > **Settings > Builds > Build variables**.
    *   Registra las siguientes dos variables y sus valores productivos:
        *   `VITE_SUPABASE_URL`
        *   `VITE_SUPABASE_ANON_KEY`
2.  **Verificación**: Si el pipeline de compilación no posee estas variables o no cuenta con acceso a la red de Supabase, la build abortará con un código de error de Node.js, bloqueando el despliegue del proyecto.


### 6.3 Secretos Del Worker

La siguiente lista corresponde al Worker productivo o a una promoción futura.
Durante la Fase 2 no se debe ejecutar con `wrangler.jsonc`; el único secreto
de IA habilitado para pruebas es el del Worker DEV mediante
`wrangler.phase2-dev.jsonc`, como se explica en la sección 5.2.

Configurar solo los que se usen:

```powershell
npx wrangler secret put GROQ_API_KEY --config wrangler.jsonc # Solo tras autorizar la promoción a producción
npx wrangler secret put CF_API_TOKEN
npx wrangler secret put CF_ACCOUNT_ID
npx wrangler secret put SUPABASE_MANAGEMENT_TOKEN
npx wrangler secret put SUPABASE_PROJECT_ID
npx wrangler secret put GA_SERVICE_ACCOUNT_JSON
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put VAPID_SUBJECT
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
```

Notas:

- `GROQ_API_KEY`: moderacion IA.
- `CF_API_TOKEN` y `CF_ACCOUNT_ID`: metricas Cloudflare en `/api/metrics`.
- `SUPABASE_MANAGEMENT_TOKEN` y `SUPABASE_PROJECT_ID`: reservado para metricas/gestion Supabase.
- `GA_SERVICE_ACCOUNT_JSON`: reservado para integrar metricas GA por servidor.
- `SUPABASE_SERVICE_ROLE_KEY`: acceso exclusivo del Worker para registrar
  suscripciones y despachar la cola Push; nunca debe exponerse al cliente.
- `VAPID_SUBJECT`: contacto del operador, por ejemplo
  `mailto:soporte@cubitathome.com`.
- `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`: par VAPID generado una sola vez. La
  clave publica se entrega al navegador; la privada existe solo como secreto.

### 6.4 Deploy Manual

Desde `web/`:

```powershell
npm run deploy
```

Este comando ejecuta lint, pruebas, el build integral de Fase 4, solicita la
frase `DEPLOY PRODUCTION` en una terminal interactiva y solo entonces ejecuta
Wrangler con la configuración de producción. Para DEV, usa
`npm run deploy:phase2-dev` y escribe `DEPLOY DEV` cuando se solicite.

Las RPC autenticadas usadas por la interfaz deben estar declaradas en
`additionalAuthenticatedRpcs` del entrypoint de Worker correspondiente
(`worker-phase2-production.ts` o `worker-phase2-dev.ts`). La lista solo permite
que la petición autenticada atraviese el proxy; no reemplaza los controles de
rol, RLS ni las comprobaciones propias de cada RPC en Supabase.

### 6.5 Deploy Desde GitHub

En Cloudflare conectar:

```txt
Repository: BladeX1X/Cubitat
Root directory: web
Build command: npm run build:phase4-production
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
8. En `Mi cuenta`, activar notificaciones y confirmar la recepcion y el clic en
   Chrome Android y en una instalacion de Safari iOS/iPadOS.

En desarrollo local, Vite sirve un worker temporal de autolimpieza en `/sw.js`
para retirar registros y caches Workbox antiguos del origen. Esto evita que
`F5` cargue una version anterior mientras `Ctrl+F5` muestra la actual. El flujo
solo aplica a `vite serve`; el build productivo conserva `autoUpdate`,
`skipWaiting`, `clientsClaim` y sus cabeceras sin cache.

El service worker productivo no debe cachear Supabase REST. Esas respuestas
pueden variar por sesion, rol, RLS y cambios recientes. El cache runtime se
reserva para imagenes publicas de Supabase Storage.

### 10.1 Activacion de Web Push

Antes del deploy que habilite Web Push:

1. Generar un par VAPID fuera del repositorio; no guardar la clave privada en
   Git, `.env` versionados ni documentacion.
2. Aplicar `20260911010000_add_web_push.sql` mediante el flujo normal de
   migraciones y comprobar `supabase migration list --linked` y
   `supabase db lint --linked`.
3. Configurar los cuatro secretos de Web Push indicados en 6.3.
4. Confirmar que `wrangler.jsonc` contiene el Cron de un minuto y desplegar el
   Worker junto con el build PWA.
5. Crear una notificacion real para un usuario de prueba y verificar que aparece
   una entrega `sent`; al tocarla debe abrir su `action_path`.

Rollback operativo: retirar el Cron y desplegar de nuevo detiene nuevos envios
sin borrar las notificaciones internas. La base se corrige siempre con una
migracion posterior; no se eliminan tablas productivas manualmente.

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

## 12. Integracion Mediante Pull Request

Trabajar en una rama `feature/`, `bugfix/`, `hotfix/`, `docs/` o `release/`;
nunca hacer commits o push directo a `main`. Conservar cambios ajenos y añadir
solo los archivos revisados de la tarea, sin secretos ni artefactos generados.

Antes de abrir el PR, ejecutar lint, pruebas y build. Revisar el diff y las
migraciones, publicar la rama y completar la revision del PR. La fusion y el
despliegue deben seguir la autorizacion y el procedimiento operativo vigente.
Una comprobacion local no equivale a una verificacion de produccion.

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

Validar cabeceras defensivas en HTML:

```powershell
$headers = Invoke-WebRequest -Uri 'https://cubitathome.com/' -Method Head
$headers.Headers['Strict-Transport-Security']
$headers.Headers['Content-Security-Policy']
```

Esperado: HSTS con vigencia anual e `includeSubDomains`; CSP sin
`unsafe-inline` dentro de `script-src` y con `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'` y `frame-ancestors 'none'`.

## 14. Checklist De Produccion

- GitHub repo actualizado en `main`.
- `npm run build` pasa.
- Supabase migraciones aplicadas.
- Supabase Auth URLs configuradas.
- Supabase Storage `property_images` y `avatars` listos, con WebP, límites de
  5 MiB/1 MiB y escrituras aisladas en la carpeta del usuario.
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
- HSTS y CSP endurecida verificadas en la respuesta productiva.

### Entorno aislado y promoción de Fase 2

- Los módulos de Fase 2 se mantienen separados por migraciones y entrypoints:
  DEV conserva su cadena propia y producción solo incluye módulos promovidos.
- Producción ya incluye KYC, perfiles/agentes, métricas de contacto,
  verificación de propiedades, reglas de duplicados, retención KYC de 24 horas
  y el esquema de cola para alertas por correo.
- La comparación pHash permanece fuera del build productivo base. La promoción
  explícita de Fase 2 usa `npm run build:phase2-production`, las migraciones
  productivas `20261010120000` y `20261010130000`, y la bandera
  `PHASE2_IMAGE_DUPLICATES_ENABLED`; la señal solo es visible a moderación AAL2
  y nunca publica/rechaza automáticamente. No desplegar ese perfil antes de
  confirmar las migraciones y el build aislado.
- El Worker productivo programa Push y purga KYC. La entrega automatizada de
  alertas por correo está aplazada deliberadamente desde el commit
  `420b9ea` (`fix(production): defer alert email delivery`); el dispatcher de
  Resend permanece habilitado solo en el Worker Phase 2 DEV hasta completar QA
  y aprobar su promoción. No contar la cola como evidencia de correos enviados.
- `kyc_documents` permanece privado. La evidencia se elimina 24 horas después
  de aprobar o rechazar una solicitud; el registro mínimo permanece en la base.
- Cuando se autorice reactivar la entrega de alertas, el dispatcher requerirá
  `RESEND_API_KEY` y un remitente verificado en Resend. Mientras esté aplazada,
  las notificaciones internas y Push no dependen de esa entrega de correo.
- La retención de auditoría de Auth sigue separada en 90 días y continúa sin
  Cron destructivo.

## 15. Operacion Y Rollback

Para pérdida del autenticador de un administrador, seguir el
[runbook de recuperación MFA](ADMIN_MFA_RECOVERY.md). No desactivar MFA/AAL2 ni
modificar RLS como vía de recuperación. La eliminación de un factor requiere
autorización, verificación de identidad y la API Admin de Supabase ejecutada
exclusivamente desde servidor.

Ver logs de Cloudflare:

```powershell
npx wrangler tail
```

La observabilidad de Cubitat conserva los eventos propios estructurados, pero
deshabilita `observability.logs.invocation_logs` en `wrangler.jsonc`. Los logs
automáticos incluyen método y URL de la invocación y pueden capturar parámetros
temporales de callbacks. No volver a habilitarlos sin revisar primero todas las
rutas de autenticación.

Los eventos del Worker solo pueden incluir nombres de evento, proveedor,
dimensión del límite, acción y código HTTP. No registrar correos, IDs, URLs,
parámetros, tokens, cuerpos de terceros ni objetos `Error`. `wrangler tail` se
debe ejecutar solo durante una investigación concreta y su salida no debe
copiarse al repositorio o al vault.

En el frontend, `src/shared/lib/logger.ts` es la única salida autorizada a
`console.*`. `module`, `action`, `level` y `code` se validan en runtime contra
formatos cerrados; los valores no válidos se sustituyen por categorías seguras.
No registrar errores crudos, `ErrorInfo`, mensajes libres, IDs, URLs, tokens ni
datos personales. La prueba de arquitectura
`src/shared/lib/frontendLoggingArchitecture.test.mjs` bloquea nuevas llamadas
directas a consola fuera del logger y de los Workers expresamente excluidos.

Cloudflare aplica la retención de Workers Logs según el plan contratado. Los
Auth Audit Logs de Supabase tienen retención y disponibilidad propias del plan;
no purgar `auth.audit_log_entries` ni desactivar su escritura sin autorización
destructiva explícita y una política de conservación aprobada.

La política vigente está en `docs/AUDIT_LOG_RETENTION_POLICY.md`: 90 días
móviles para `auth.audit_log_entries`, 180 días para evidencia sanitizada de un
incidente confirmado y retención nativa del proveedor para logs externos. Fue
aprobada por el propietario del producto el 2026-08-09. La implementación y la
primera purga conservan autorizaciones independientes; no ejecutar SQL, Cron,
Log Drain o eliminación basándose únicamente en la aprobación documental.

Listar versiones:

```powershell
npx wrangler versions list
```

Rollback:

```powershell
npx wrangler rollback
```

Para base de datos, no usar rollback destructivo. Crear una migracion correctiva.

### 15.1 Turnstile en Supabase Auth

El registro y la recuperacion de contrasena deben enviar el token del widget en
la misma llamada de Supabase Auth mediante `captchaToken`. No verificar ese token
antes con otro `siteverify`: los tokens de Turnstile son de un solo uso.

La configuracion versionada usa:

```toml
[auth.captcha]
enabled = true
provider = "turnstile"
secret = "env(SUPABASE_AUTH_CAPTCHA_SECRET)"
```

Antes de aplicar la configuracion remota, definir
`SUPABASE_AUTH_CAPTCHA_SECRET` solo en el entorno seguro desde el que se ejecuta
Supabase CLI. No escribir el secreto en Git, archivos `.env` versionados,
documentacion, logs ni comandos que lo impriman. En el Dashboard se puede
confirmar el estado en `Authentication > Attack Protection` sin revelar el
valor del secreto.

La comprobacion de cierre debe cubrir una solicitud sin token rechazada por
CAPTCHA y un registro o recuperacion real con token valido, autorizado para no
crear cuentas ni enviar correo involuntariamente.

## 16. Archivos De Referencia

```txt
docs/OPERACION.md
docs/ADMIN_MFA_RECOVERY.md
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

## Preparación de código para Fase 3

El perfil candidato `phase3-production` genera la aplicación con módulos F3 y requiere la configuración pública de Supabase productivo. Comandos:

- `npm run build:phase3-production` genera sitemap dinámico y verifica los bundles; requiere `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` de producción.
- `npm run build:phase3-production:ci` usa sitemap estático para CI.

No desplegar todavía: `PHASE3_ENABLED` sigue en `false`; primero reconciliar y verificar migraciones y objetos hosted, completar QA autenticado y configurar secretos del Worker. La configuración pública de Supabase no reemplaza los secretos privados.

### Consentimiento público de WhatsApp sin activar el resto de Fase 3

El perfil `phase2-agent-consent-production` habilita solo el control de
consentimiento de WhatsApp en `Mi cuenta`; mantiene `VITE_PHASE3_UI_ENABLED` y
`PHASE3_ENABLED` apagados. Su despliegue requiere que las migraciones
`20261025210000`, `20261025220000`, `20261025240000` y `20261026200000` estén
registradas en producción. Después del build, el check
`verify-phase2-agent-consent-bundle.mjs` confirma que el paquete no incluye el
resto de la interfaz Fase 3.

## Despliegue Fase 3 en producción — 2026-11-04 (rectificación)

El estado anterior de esta guía indicaba que F3 seguía apagada; esa descripción era vigente antes de la promoción y queda supersedida por este registro. PR #197 se integró en `main` como `521c02ba929c33be48eee50297f845265be29e75`. La configuración productiva fija `PHASE3_ENABLED=true` y el Worker `cubitat1` está en versión `6fc63a25-e5df-4cbe-b6d9-5375342bd3cf` al 100%. El propietario confirmó visualmente en Supabase productivo las seis migraciones F3, tablas, RPC y bucket requeridos; el deploy no ejecutó DDL ni cambios de datos.

Preflight: gates locales lint, 829 pruebas/1 omitida, build estándar y `build:phase3-production` PASS; quality/database-security PASS en GitHub; builds generaron sitemap dinámico de 446 URLs. Se configuró `AGENT_APPLICATION_EMAIL_TO` como secreto Worker usando el correo provisional acordado, sin guardar su valor en Git.

Smoke HTTP productivo: home 200, sitemap 200, intake sin sesión 405 y endpoint privado de documentos sin sesión 401. El cron productivo de correo/purga está activo cada minuto. No se enviaron postulaciones ni correos de prueba. La fase está desplegada, pero no se marca funcionalmente cerrada hasta completar QA autenticado de postulación, apertura AAL2, decisión administrativa y observación de correo/retención.
## 9. Fase 4 — despliegue productivo (2026-11-05)

La promoción F4 quedó aplicada en `main` y producción:

- Migraciones F4: usar el workflow manual `.github/workflows/phase4-production-migrations.yml`; no ejecutar `db push` global ni reparar historial. El workflow valida el proyecto, reúne fuentes locales para migraciones ya registradas, limita los pendientes a las ocho versiones F4, corre dry-run y verifica Storage/grants tras aplicar.
- Frontend/Worker: construir `npm run build:phase4-production` con configuración pública Supabase de producción y sitemap dinámico. Publicar `wrangler deploy --config wrangler.jsonc` después del guard interactivo `node scripts/confirm-deploy.mjs production`.
- Despliegue observado: `cubitat1` v`8f8731c7-9384-4490-83d6-e5a5218b43e2`; 446 URLs en sitemap. Workflow DB: https://github.com/BladeX1X/Cubitat/actions/runs/42009714135.
- Smoke HTTP de rutas no sustituye pruebas autenticadas. Pagos/suscripciones de beneficios siguen sin activarse.

Registro: [[Cubitat - Despliegue Fase 4 Produccion 2026-11-05]].

### Perfil de despliegue requerido — rectificación 2026-11-05

El Worker activo posterior al despliegue inicial devolvía la portada al abrir
`/valorar`, porque el perfil `phase2-production` desactiva los flags visuales
F4. El perfil de producción para cualquier build o publicación automática debe
ser `phase4-production`. `npm run deploy` y Cloudflare Workers Builds deben usar
`npm run build:phase4-production`; solo CI usa `npm run build:phase4-production:ci`.
Un `200` de una ruta SPA no demuestra que esa ruta funcional esté habilitada.

### Valoración aplazada — rectificación 2026-11-05

La decisión de producto es mantener la valoración orientativa para el futuro.
Aunque el perfil `phase4-production` habilita Servicios, Reseñas, Materiales y
Beneficios, debe mantener `VITE_PHASE4_VAL_ENABLED=false`; la ruta y el enlace
`/valorar` no deben formar parte del bundle productivo. La guía anterior sobre
usar el perfil F4 no autorizaba activar Valoración. Solo DEV puede habilitarla
con `VITE_PHASE4_VAL_ENABLED=true` para pruebas.

### Rectificación F3 — base y Worker productivos, 2026-11-07

La consulta directa al ledger y catálogo del 2026-11-07 encontró que la
descripción del 2026-11-04 no correspondía al estado real de producción. La
base `tohjzoncoosvjbjcakdl` recibió de forma controlada 15 migraciones F3
mediante el workflow [42364846320](https://github.com/BladeX1X/Cubitat/actions/runs/42364846320).
El workflow verificó el proyecto objetivo, el conjunto exacto pendiente, el
dry-run, el esquema resultante, el bucket privado y privilegios críticos.

El Worker `cubitat1` se publicó con el build `phase4-production` para conservar
los módulos F4 ya activos e incluir F3. Versión Cloudflare:
`be8ec127-3ddf-4b8b-a0e3-135d76466a62`, 100% del tráfico; se conservaron las
rutas del dominio y el cron existente. Se generó sitemap dinámico con 446
URLs. Smoke HTTP: `/`, `/postular-agente`, `/panel-agente` y `/sitemap.xml`
respondieron 200; `POST /api/phase3/agent-applications` sin sesión respondió
401, confirmando que no permite enviar sin autenticación.

Este despliegue confirma disponibilidad HTTP y protección anónima, no el flujo
completo autenticado. Sigue pendiente validar con cuenta autorizada el envío de
postulación, lectura de documentos con AAL2, decisión y revocación administrativa,
además de comprobar entrega de correo y purga de documentos en producción.

## Favoritos de Servicios/Materiales — corrección productiva — 2026-11-23

La tabla, sus migraciones y permisos RLS ya existían. Se corrigió la allowlist del Worker para aceptar escrituras autenticadas a `saved_marketplace_listings`. Pasaron lint, 1,146 pruebas (1 omitida), build `phase4-production` y verificadores de bundles. Worker `cubitat1`: `bf754180-1310-4077-905c-65e70dbb0f3c`.

Verificación: portada y `/favoritos` HTTP 200; un POST con JWT deliberadamente inválido llegó a Supabase y recibió 401, sin escribir datos, en vez del 403 del Worker. Pendiente verificar guardar/quitar con una sesión real. El ledger productivo tiene 167 versiones: no ejecutar el paquete antiguo de migraciones.

## Desactivación de MFA administrativo — producción — 2026-11-23

Aplicada y verificada la migración `20261123090000_disable_admin_mfa_requirement.sql` en `tohjzoncoosvjbjcakdl`. El preflight comparó las 167 versiones remotas contra el release completo; el dry-run seleccionó únicamente la nueva migración. La solicitud del usuario fue no generar respaldo. Postcheck: ledger 168, nueva versión registrada y `public.is_admin_aal2()` delega en `public.is_admin()`.

Desplegados frontend y Worker `cubitat1`, versión `0d79f4a9-9947-4b20-8eb1-91b3d887cf2a` al 100%. Gates: lint, 248 archivos/1,134 PASS/1 SKIP, `build:phase4-production` y verificadores PASS; home, `/moderar` y recuperación HTTP 200, índice del build y chunk administrativo 200. No se hizo QA con sesión admin autenticada; queda pendiente confirmar acceso admin AAL1 y revisar posible requisito AAL2 independiente de Supabase Auth durante recovery. Los factores TOTP inscritos siguen intactos. La contraseña temporal compartida en el chat requiere rotación; no copiarla a archivos.
## Tarjetas con diseño compartido — producción — 2026-11-23

Se desplegó el marco común de las tarjetas de Comprar, Servicios y Materiales en `cubitat1`, versión `318d5a93-5f0e-4ef2-8a3b-4859924951e1` (100%). Pasaron lint, 249 archivos de pruebas (1,135 PASS, 1 omitida), build `phase4-production`, sitemap dinámico de 446 URLs y verificadores de bundles. Smoke posterior: `/`, `/resultados`, `/servicios` y `/materiales` HTTP 200; el CSS compartido HTTP 200 contiene la cuadrícula desde 320 px y la portada 16:9. Sin migraciones ni cambios de datos.

## Etiquetas editoriales en resultados — producción — 2026-11-23

Se ocultaron las etiquetas Nuevo, Destacado y Exclusivo en las tarjetas de resultados y en el carrusel del mapa. Los valores `properties.badge` se conservan en los anuncios y no se modificó el esquema. `cubitat1` versión `4244f315-3eb7-49ee-80f0-825340a77f7c` al 100%; lint, pruebas (249 archivos, 1,148 PASS y 1 omitida), build estándar y verificadores Fase 4 PASS. Portada y `/resultados` HTTP 200.

## 2026-11-23 — Galería compartida en Servicios y Materiales

Se desplegó `CatalogCardGallery` en las tarjetas de Servicios y Materiales. Ambas usan flechas y puntos accesibles cuando existen varias fotos; se firma la galería para permitir la navegación y se conservan los campos propios de cada catálogo. Worker `cubitat1` versión `5b72bda8-49e4-48c1-a875-9b68ca2e6e86` al 100%. Lint, suite completa (1,150 PASS, 1 omitida), build Fase 4 y verificadores PASS. Rutas y módulo compartido respondieron HTTP 200. Sin migraciones ni cambios de datos. QA visual con anuncios multi-foto pendiente.
## Fichas de Servicios y Materiales con diseño compartido — producción — 2026-11-23

Ambas fichas públicas reutilizan `MarketplaceListingDetail` para toolbar, breadcrumb, hero adaptable, galería y panel de contacto. Los campos inferiores siguen siendo específicos del catálogo. Gates: lint, 249 archivos/1,152 pruebas PASS/1 omitida, build estándar y build `phase4-production` con verificadores PASS. Worker `cubitat1`, versión `b4593cbf-cb36-49f6-bd69-f3a3223a04c4`. Smoke solo lectura: `/servicios`, `/materiales`, bundles de las fichas y CSS compartido HTTP 200. Sin cambios de esquema ni datos. QA visual manual móvil pendiente.
## Reseñas públicas de Servicios ocultas temporalmente — producción — 2026-11-23

La ficha pública ya no carga ni presenta el panel de reseñas; perfiles, opiniones, moderación administrativa y esquema quedan intactos. El verificador de bundles exige que la sección «Comparte tu experiencia» no aparezca en producción. Lint PASS; suite completa 249 archivos, 1,152 PASS/1 omitida; build estándar y phase4-production/verificadores PASS. Worker `cubitat1` versión `4ffec3d4-bc08-452a-9243-c2e31fb57030`. Smoke de solo lectura: catálogo y ficha de Servicios HTTP 200; bundle de la ficha HTTP 200 y sin el texto del panel. Sin migraciones ni cambios de datos.
## Reportes de Servicios/Materiales y perfiles destacados — implementación local — 2026-11-23

Se implementó el formulario con Turnstile, ruta Worker y migración aislada 20261123100000_marketplace_listing_reports.sql; Moderación combina reportes de inmuebles y marketplace y revisa estos últimos sin pausar anuncios. Las fichas incorporan la denuncia adaptada y perfiles profile_featured vigentes. Gates locales: lint PASS; suite 250 archivos, 1,156 PASS/1 omitida; build estándar PASS. La migración no se aplicó y no se desplegó: el workflow productivo de esquema F3/F4 exige un respaldo exitoso reciente y no admite aplicar solo esta versión. No se intentó eludir esa condición.

## Métricas de usuarios captados en Panel de Agente — implementación local — 2026-11-25

La interfaz privada añade conteos agregados de altas registradas desde el enlace del agente. La lectura usa `get_own_agent_acquisition_metrics()`; la RPC valida rol/KYC y devuelve únicamente el total propio, sin datos personales. La captura del conteo tiene estados de carga, fallo y reintento, y no muestra un cero ficticio si el servicio falla. La segunda tarjeta deja los usuarios con plan pagado como «Aún no disponible»: no existe todavía un ledger real de suscripciones/pagos y no se atribuyen pagos a clics. Se requiere promover la migración junto al bundle mediante el flujo coordinado de base de datos; no se aplicó a un proyecto remoto en esta implementación local.

### Promoción productiva

Después de integrar los cambios y superar `quality` y `database-security`, ejecutar primero el workflow `Apply agent acquisition metrics migration to production` desde `main`. Requiere la frase explícita `APPLY AGENT ACQUISITION METRICS WITHOUT BACKUP`, comprueba el proyecto y el ledger exactos y detiene la ejecución si encuentra cualquier migración pendiente adicional. No crea respaldo por instrucción del usuario. Solo después de una migración verificada, publicar frontend y Worker con `npm run deploy` desde el release integrado, que construye el perfil `phase4-production` y verifica sitemap y bundles antes del guard de producción. Completar un smoke autenticado del panel y las rutas públicas antes de registrar producción como verificada.

## Atribución de registros OAuth de agente — 2026-11-25

La nueva cuenta creada mediante Google puede atribuirse al enlace abierto en la misma pestaña: la aplicación conserva el código validado en `sessionStorage` y el callback invoca una RPC autenticada. PostgreSQL limita la operación a una cuenta Google `buyer` creada en los últimos 15 minutos, resuelve el código contra el enlace activo y el agente verificado y escribe en el ledger inmutable. No se atribuyen logins de cuentas existentes. La RPC se expone por la allowlist autenticada del Worker, no por una llamada pública.

Antes del despliegue productivo, integrar CI `quality` y `database-security`; desde `main`, ejecutar el workflow dedicado `Apply Google referral attribution migration to production` con la confirmación `APPLY GOOGLE REFERRAL ATTRIBUTION WITHOUT BACKUP`; revisar su preflight/dry-run/postcheck; luego publicar con `npm run deploy` y comprobar callback OAuth en una cuenta de prueba nueva y en una cuenta preexistente. La migración no debe aplicarse con `db push` global.

## Cierre de atribución Google — producción — 2026-11-26

PR #288 integrado (`bfa5e75b6025f4faa148f8a1630df136fe880aa0`); controles requeridos `quality` y `database-security` PASS. La migración `20261125110000_oauth_agent_signup_attribution.sql` se aplicó mediante el workflow dedicado desde `main`, sin respaldo por solicitud expresa; su postcheck de seguridad PASS. El Worker `cubitat1` versión `250879f7-8306-4281-96fc-65e6d84c2616` está al 100 %. Sitio y bundles publicados HTTP 200; se verificó la RPC en el callback y la clave de sesión de referidos en el bundle principal. QA autenticado de alta nueva y login existente queda pendiente; no se crearon usuarios de producción para probar.

## Lista de agentes con plaza administrativa — candidata de producción — 2026-11-26

PR #290 añade la plaza administrativa a la lista de Moderación sin permitir retirar el rol administrador. La migración `20261126120000_agent_admin_assignment_moderation_list.sql` cambia el tipo de retorno de la RPC y exige desplegar cliente y esquema coordinadamente. Tras integrar el PR, ejecutar solo `Apply agent admin moderation list migration to production` desde `main` con `APPLY AGENT ADMIN MODERATION LIST WITHOUT BACKUP`; el flujo verifica el target, que esta sea la única versión pendiente, el checksum y los grants antes/después. No crea respaldo por instrucción expresa del usuario. Luego desplegar el Worker/UI y revisar Moderación con sesión administrativa. Aún no integrada ni verificada en producción.

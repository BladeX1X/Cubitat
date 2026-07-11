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

#### 3.3.1 Alternativa: Ejecución Manual vía SQL Editor (Consola de Supabase)

Si experimentas problemas de compatibilidad o arquitectura con la CLI de Supabase (por ejemplo, errores de tipo `No matching Supabase CLI binary package found`), puedes aplicar los esquemas manualmente:

1.  **Acceder al Editor SQL**:
    *   En el Dashboard de Supabase, navega a la sección **SQL Editor**.
    *   Haz clic en **New query** (Nueva consulta).
2.  **Ejecutar los Esquemas**:
    *   Copia y ejecuta las sentencias de los archivos `.sql` en el orden listado dentro de la carpeta `web/supabase/migrations/`.
3.  **Habilitar Tabla de Contactos (Leads)**:
    *   Para habilitar la persistencia de leads de interés desde el formulario de contacto, copia y ejecuta el siguiente bloque:
    ```sql
    -- Crear la tabla de contactos
    CREATE TABLE contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
        contact_name TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Habilitar RLS
    ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

    -- Política para inserciones públicas
    CREATE POLICY "Allow public insert for contacts" ON contacts 
        FOR INSERT WITH CHECK (true);

    -- Política para lecturas restringidas al dueño del anuncio y admins
    CREATE POLICY "Allow read for owners and admins" ON contacts 
        FOR SELECT USING (
            auth.uid() IN (
                SELECT user_id FROM properties WHERE id = contacts.property_id
            ) OR (
                SELECT role FROM profiles WHERE id = auth.uid()
            ) = 'admin'
        );

    -- Función del disparador para notificar al propietario sobre un nuevo contacto
    CREATE OR REPLACE FUNCTION public.handle_new_contact()
    RETURNS TRIGGER AS $$
    DECLARE
      v_owner_id UUID;
      v_property_title TEXT;
    BEGIN
      SELECT user_id, title INTO v_owner_id, v_property_title
      FROM public.properties
      WHERE id = NEW.property_id;

      IF v_owner_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message)
        VALUES (
          v_owner_id,
          'Interés en tu propiedad',
          NEW.contact_name || ' te ha enviado un mensaje por "' || v_property_title || '". Tel: ' || NEW.contact_phone
        );
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Crear el trigger sobre la tabla contacts
    CREATE OR REPLACE TRIGGER on_new_contact
      AFTER INSERT ON public.contacts
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_contact();
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
*   **Seguridad**: RLS habilitado.
*   **Políticas**:
    *   `Permitir lectura pública (SELECT)`: Cualquier usuario (incluso no autenticado) puede leer perfiles para visualizar datos de contacto del anunciante de forma pública.
    *   `Permitir actualización propia (UPDATE)`: Solo el usuario autenticado cuyo `auth.uid()` coincida con el `id` del registro puede modificar su información de perfil.

#### 2. Tabla `properties` (Inmuebles)
*   **Seguridad**: RLS habilitado.
*   **Políticas**:
    *   `Lectura pública (SELECT)`: Permitida para cualquier usuario únicamente si el anuncio tiene el estado `status = 'published'`.
    *   `Lectura privada de borradores/revisiones (SELECT)`: Solo el propietario del anuncio (`owner_id = auth.uid()`) o usuarios con el rol `admin` en la tabla `profiles` pueden consultar propiedades en estados `draft`, `pending_review`, `rejected` o `paused`.
    *   `Creación (INSERT)`: Permitido para cualquier usuario autenticado. El sistema inserta y vincula obligatoriamente el registro con el ID del creador (`owner_id = auth.uid()`).
    *   `Modificación/Eliminación (UPDATE/DELETE)`: Permitido únicamente al propietario (`owner_id = auth.uid()`) o a usuarios administradores (`role = 'admin'`).

#### 3. Tabla `property_images` (Galería de Fotos)
*   **Seguridad**: RLS habilitado.
*   **Políticas**:
    *   `Lectura (SELECT)`: Pública para todos.
    *   `Escritura/Borrado (INSERT/DELETE)`: Solo permitida si el usuario autenticado es el propietario de la propiedad relacionada (`property_id` apunta a una propiedad cuyo `owner_id = auth.uid()`).

#### 4. Tabla `contacts` (Prospectos y Leads)
*   **Seguridad**: RLS habilitado.
*   **Políticas**:
    *   `Creación (INSERT)`: Permitido de forma pública (anon) para permitir que cualquier interesado envíe mensajes al anunciante.
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

### 6.2.1 Variables en el Entorno de Construcción (Build Variables)

Durante el proceso de compilación (`npm run build`), el compilador ejecuta el script `node scripts/generate-sitemap.mjs`. Este script realiza llamadas directas a la API de Supabase para recuperar la lista de propiedades públicas y construir el archivo `sitemap.xml` dinámicamente.

Para que la compilación no falle en entornos de integración continua (CI/CD) como GitHub Actions o el motor de build automático de Cloudflare Pages:

1.  **Configurar Variables de Build**:
    *   En el dashboard de Cloudflare, ve a tu proyecto > **Settings > Builds > Build variables**.
    *   Registra las siguientes dos variables y sus valores productivos:
        *   `VITE_SUPABASE_URL`
        *   `VITE_SUPABASE_ANON_KEY`
2.  **Verificación**: Si el pipeline de compilación no posee estas variables o no cuenta con acceso a la red de Supabase, la build abortará con un código de error de Node.js, bloqueando el despliegue del proyecto.


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

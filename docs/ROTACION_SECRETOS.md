# Rotacion de secretos de Cubitat

Esta guia explica como rotar las claves usadas en produccion, donde encontrarlas y como subirlas sin guardarlas en el repositorio.

## Reglas

- No pegar secretos en archivos del repo.
- No poner secretos en `wrangler.jsonc`.
- Usar `wrangler secret put` para Cloudflare Worker.
- Usar Supabase Dashboard o Management API para configuracion de Auth/SMTP.
- Despues de pegar una clave en un chat o ticket, rotarla.

## Rotacion coordinada de Turnstile (Worker + Auth DEV/produccion)

El widget compartido usa el mismo secreto en tres destinos: el Worker
`turnstile-siteverify-cubitat` (`TURNSTILE_SECRET_KEY`), Supabase DEV
`bknwerqbbysveehcdmzr` y Supabase produccion `tohjzoncoosvjbjcakdl` (en ambos,
Auth > CAPTCHA habilitado con proveedor `turnstile`). Para evitar que los tres
servicios queden con valores distintos, usa el script
`web/scripts/rotate-turnstile-secret.ps1`.

### Preparacion (una sola vez por equipo/usuario)

1. Instala las dependencias de `web` (`npm ci`) para tener la version fijada de
   Wrangler, o instala Wrangler y confirma que `wrangler.cmd whoami` reconoce la
   cuenta Cloudflare correcta.
2. Crea un Supabase Personal Access Token con permisos `auth_config_write` y
   `project_admin_write` en ambos proyectos. Guarda `SUPABASE_ACCESS_TOKEN`
   como variable de entorno de usuario desde **Editar las variables de entorno
   de esta cuenta** > **Variables de usuario** > **Nueva**. El valor queda
   almacenado en el perfil de Windows sin cifrado, así que usa un token de
   alcance mínimo en un equipo de confianza. No lo escribas como argumento de
   PowerShell ni en archivos del repo.
3. Abre una nueva ventana de PowerShell para que cargue la variable.

### En cada rotacion

1. Rota/crea primero el secreto del widget `cubitat-turnstile` en Cloudflare
   Turnstile. El script no crea ni rota el secreto del widget: distribuye el
   valor nuevo que entrega Cloudflare. Cloudflare mantiene válida la clave
   anterior mientras se actualizan los servicios; rota una sola vez y continúa
   enseguida con el script.
2. Desde la raiz del repo, ejecuta:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\web\scripts\rotate-turnstile-secret.ps1
   ```

3. Pega el nuevo secreto solo en el prompt oculto. El script actualiza Supabase
   DEV, Supabase produccion y, al final, el Worker compartido. `wrangler secret
   put` crea y despliega inmediatamente una nueva versión del Worker. No lo
   pases como argumento, no habilites transcript de PowerShell durante la
   operación y no captures la salida en un archivo.
4. Revisa que los tres destinos aparezcan `OK`. Si alguno falla, el proceso
   termina con codigo distinto de cero y muestra el destino fallido sin incluir
   respuesta del proveedor. Corrige el acceso y repite con el mismo secreto
   nuevo; no generes otro mientras los destinos sigan desincronizados.
5. Comprueba inicio de sesion, registro y recuperacion de contrasena en DEV y
   produccion, y los flujos que usan el verificador compartido (contacto/reporte).

El proceso no es atomico entre Cloudflare y Supabase. Si se interrumpe a mitad,
usa la tabla de resultados para volver a aplicar el mismo secreto a los tres
destinos. El valor se mantiene en memoria durante la ejecucion, no se imprime ni
se escribe a disco; el script limpia sus variables temporales al terminar. La
variable de entorno `SUPABASE_ACCESS_TOKEN` permanece disponible para futuras
rotaciones y almacenada como variable de usuario de Windows (sin cifrado);
elimínala desde esa configuración cuando ya no se necesite.

## Fase 2 DEV: alcance obligatorio

La Fase 2 se prueba únicamente en el Worker y proyecto Supabase DEV. Para
consultar o cambiar secretos de esta fase, usar siempre el archivo de
configuración explícito:

```powershell
cd D:\Proyectos\Cubitat\web
npx wrangler secret list --config wrangler.phase2-dev.jsonc
npx wrangler secret put NOMBRE_DEL_SECRETO --config wrangler.phase2-dev.jsonc
npm run deploy:phase2-dev
```

El proyecto Supabase DEV actual es `bknwerqbbysveehcdmzr` y el Worker DEV es
`cubitat1-phase2-dev`. No usar los comandos productivos de esta guía para
cerrar una prueba de Fase 2, ni copiar secretos de producción al entorno DEV.
Los valores de secretos nunca deben escribirse en el repositorio ni en esta
nota.

La sincronización de ajustes Auth de DEV usa `supabase config push` con ese
proyecto explícito. Antes de ejecutarla, comprobar que `web/supabase/config.toml`
mantiene `site_url` DEV y los redirects DEV, productivos y locales; el comando
sincroniza también esos valores y no solo el ajuste que se quiera cambiar.

## Secretos a rotar ahora

Estas claves fueron expuestas durante soporte y deben rotarse:

- `RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Tambien conviene revisar estas claves si fueron compartidas por otros canales:

- `SUPABASE_MANAGEMENT_TOKEN`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `CF_API_TOKEN`
- `Google OAuth Client Secret`

## Cloudflare Worker

Proyecto Worker productivo de referencia histórica:

```txt
cubitat1
```

Directorio local:

```txt
D:\Proyectos\Cubitat\web
```

Listar secretos actuales:

```powershell
npx wrangler secret list
```

Subir o reemplazar un secreto productivo (solo con autorización explícita):

```powershell
npx wrangler secret put NOMBRE_DEL_SECRETO
```

Ejemplo:

```powershell
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Después de subir secretos productivos, publica solo tras revisar el alcance:

```powershell
npm run deploy
```

`npm run cf:deploy` se conserva como alias del guard de producción `npm run deploy`.
Usa `npm run deploy` para la siguiente publicación: ambos comandos ejecutan
validaciones, compilan el perfil integral de producción y exigen confirmación
interactiva. No ejecutes `npx wrangler deploy` manualmente.

## RESEND_API_KEY

Uso:

- SMTP de Supabase Auth.
- Worker para enviar correo informando que una cuenta ya esta confirmada.

Donde encontrarla:

```txt
Resend Dashboard > API Keys
```

Como rotarla:

1. Crear una nueva API key en Resend.
2. Permitir envio desde el dominio verificado `cubitathome.com`.
3. Actualizar Cloudflare Worker:

```powershell
npx wrangler secret put RESEND_API_KEY
```

4. Actualizar SMTP de Supabase:

```txt
Supabase Dashboard > Authentication > SMTP Settings
```

Valores:

```txt
Host: smtp.resend.com
Port: 587
Username: resend
Password: <NUEVA_RESEND_API_KEY>
Sender email: notificaciones@cubitathome.com
Sender name: Cubitat
```

5. Probar:

- Recuperar contrasena.
- Crear cuenta nueva.
- Reenviar confirmacion para cuenta ya confirmada.

6. Revocar la API key vieja en Resend.

## SUPABASE_SERVICE_ROLE_KEY

Uso:

- Worker consulta Auth Admin para saber si un correo ya esta confirmado.

Donde encontrarla:

```txt
Supabase Dashboard > Project Settings > API > Project API keys > service_role
```

Importante:

- No usar esta key en frontend.
- No ponerla en `.env` publico.
- Solo debe vivir como secret del Worker o en entornos servidor seguros.

Como rotarla:

1. En Supabase, rotar/regenerar la key `service_role` si el dashboard lo permite.
2. Copiar la nueva key.
3. Subirla al Worker:

```powershell
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

4. Desplegar:

```powershell
npm run deploy
```

5. Probar el endpoint:

```powershell
Invoke-WebRequest -Method Post `
  -Uri "https://cubitathome.com/api/auth/resend-confirmation" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"email":"correo-confirmado@example.com"}'
```

Resultado esperado:

```json
{"ok":true}
```

Confirmar en logs:

```powershell
npx wrangler tail cubitat1 --format json
```

Log esperado para correo confirmado:

```txt
resend-confirmation sending already-confirmed email
```

## SUPABASE_MANAGEMENT_TOKEN

Uso:

- Consultas y operaciones de Management API desde Worker/admin.

Donde encontrarlo:

```txt
Supabase Dashboard > Account > Access Tokens
```

Como rotarlo:

1. Crear nuevo access token personal.
2. Subirlo a Cloudflare:

```powershell
npx wrangler secret put SUPABASE_MANAGEMENT_TOKEN
```

3. Desplegar:

```powershell
npm run deploy
```

4. Revocar el token viejo en Supabase.

## SUPABASE_PROJECT_ID

Uso:

- Project ref usado por Management API.

Valor actual:

```txt
tohjzoncoosvjbjcakdl
```

Donde encontrarlo:

```txt
Supabase Dashboard > Project Settings > General > Reference ID
```

Subirlo a Cloudflare si cambia:

```powershell
npx wrangler secret put SUPABASE_PROJECT_ID
```

## VITE_SUPABASE_ANON_KEY

Uso:

- Key anonima usada por el Worker para proxy seguro hacia Supabase.

Donde encontrarla:

```txt
Supabase Dashboard > Project Settings > API > Project API keys > anon / publishable
```

Subirla al Worker:

```powershell
npx wrangler secret put VITE_SUPABASE_ANON_KEY
```

Nota:

- La anon/publishable key puede ser publica, pero en este proyecto no se expone directamente al navegador porque el cliente usa `/api/supabase`.

## Google OAuth Client Secret

Uso:

- Login con Google desde Supabase Auth.

Donde encontrarlo:

```txt
Google Cloud Console > APIs y servicios > Credenciales > OAuth 2.0 Client IDs
```

Rotacion:

1. Entrar al OAuth Client usado por Cubitat.
2. Regenerar `Client secret`.
3. Actualizar Supabase:

```txt
Supabase Dashboard > Authentication > Sign In / Providers > Google
```

4. Verificar que siga configurado:

```txt
Client ID: 189530299276-df6laf6pppbande0t6s9k5kq5mu0b76k.apps.googleusercontent.com
Redirect URI en Google: https://tohjzoncoosvjbjcakdl.supabase.co/auth/v1/callback
Authorized origin: https://cubitathome.com
```

5. Probar login con Google.

## Cloudflare API Token

Uso:

- Metricas/admin si el Worker consulta Cloudflare.

Donde encontrarlo:

```txt
Cloudflare Dashboard > My Profile > API Tokens
```

Subirlo:

```powershell
npx wrangler secret put CF_API_TOKEN
npx wrangler secret put CF_ACCOUNT_ID
```

## GROQ_API_KEY

Uso:

- Moderacion por IA de publicaciones.

Donde encontrarla:

```txt
Groq Console > API Keys
```

Subirla:

```powershell
npx wrangler secret put GROQ_API_KEY
```

Probar:

- Publicar o reevaluar una propiedad.
- Verificar que pase por moderacion IA.

## GEMINI_API_KEY

Uso:

- Reservado para integraciones IA si se activan.

Donde encontrarla:

```txt
Google AI Studio / Google Cloud > API Keys
```

Subirla:

```powershell
npx wrangler secret put GEMINI_API_KEY
```

## Validacion despues de rotar

Validar el perfil integral de producción:

```powershell
npm run build:phase2-production
```

Desplegar:

```powershell
npm run deploy
```

Ver logs:

```powershell
npx wrangler tail cubitat1 --format json
```

Checklist funcional:

- Crear cuenta nueva envia confirmacion.
- Recuperar contrasena envia correo.
- Reenviar confirmacion a cuenta pendiente envia enlace.
- Reenviar confirmacion a cuenta ya confirmada envia aviso de cuenta confirmada.
- Login con Google funciona.
- Publicar propiedad dispara moderacion IA.
- Campanita de notificaciones marca como leido sin reaparecer.

## Comandos utiles

Estado de git antes de tocar secretos/config:

```powershell
git status --short
```

Build:

```powershell
npm run build
```

Deploy completo:

```powershell
npm run cf:deploy
```

No publiques Worker/assets manualmente sin rebuild. Usa `npm run deploy` para
producción o `npm run deploy:phase2-dev` para DEV; ambos verifican el build
correspondiente y requieren confirmación interactiva.

Listar versiones desplegadas:

```powershell
npx wrangler versions list
```

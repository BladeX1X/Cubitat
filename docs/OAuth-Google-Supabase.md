# OAuth Google con Supabase Auth

## Estado

Frontend preparado.

El boton `Google` del modal de login ya ejecuta:

```ts
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: getAuthRedirectUrl('/auth/callback?flow=oauth'),
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
})
```

Archivo:

```txt
D:\Proyectos\Cubitat\web\src\modules\auth\components\LoginModal.tsx
```

La pagina `/auth/callback` ya intercambia el `code` de Supabase por sesion. En OAuth se usa `?flow=oauth` para volver directo al inicio sin mostrar la pantalla de correo confirmado.

## URLs que se deben configurar

### En Google Cloud Console

Crear un OAuth Client ID tipo:

```txt
Web application
```

Authorized JavaScript origins:

```txt
http://127.0.0.1:5173
https://cubitathome.com
```

Authorized redirect URIs:

```txt
https://tohjzoncoosvjbjcakdl.supabase.co/auth/v1/callback
```

Importante: Google redirige hacia Supabase, no directamente hacia Cubitat.

## En Supabase Dashboard

Ruta:

```txt
Authentication > Sign In / Providers > Google
```

Activar Google y pegar:

```txt
Client ID
Client Secret
```

URL Configuration:

```txt
Site URL local:
http://127.0.0.1:5173

Redirect URLs:
http://127.0.0.1:5173/auth/callback
https://cubitathome.com/auth/callback
```

## Configuracion local

`web/supabase/config.toml` incluye un bloque preparado:

```toml
[auth.external.google]
enabled = false
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
```

No activar este bloque con secretos reales en git. Para el proyecto hosted, configurar Google desde Supabase Dashboard.

## Configuración vigente de Fase 2 DEV - 2026-09-28

La prueba aislada de Fase 2 usa el proyecto Supabase DEV enlazado al CLI:

```txt
https://bknwerqbbysveehcdmzr.supabase.co
```

En Google Cloud, el cliente web de DEV debe conservar como URI de
redireccionamiento técnico únicamente el callback de Supabase DEV:

```txt
https://bknwerqbbysveehcdmzr.supabase.co/auth/v1/callback
```

En Supabase Auth DEV, `site_url` y los redirects de aplicación deben apuntar
al Worker DEV:

```txt
https://cubitat1-phase2-dev.pochiprats18.workers.dev
https://cubitat1-phase2-dev.pochiprats18.workers.dev/auth/callback*
https://cubitat1-phase2-dev.pochiprats18.workers.dev/recuperar-contrasena
```

El archivo `web/supabase/config.toml` ya mantiene el `client_id` y la
referencia segura a `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)`. En la última
revisión ese secreto no estaba cargado en la sesión CLI, por lo que OAuth DEV
queda pendiente de configuración externa. No se debe copiar el secreto a este
archivo, al repositorio ni a la nota.

Este bloque DEV es independiente del callback histórico de producción y no
autoriza cambios en `cubitathome.com`.

## Nota sobre gcloud CLI

Google Cloud SDK ya esta instalado en la maquina:

```txt
Google Cloud SDK 565.0.0
```

Para este flujo no hace falta usar `gcloud` salvo que se quiera automatizar gestion de proyecto. La creacion del OAuth Client normalmente se termina en Google Cloud Console porque depende de cuenta, consentimiento OAuth y permisos del propietario.

## Pendiente: mostrar marca Cubitat en Google OAuth

Actualmente Google puede mostrar el destino como:

```txt
tohjzoncoosvjbjcakdl.supabase.co
```

Esto ocurre porque el callback tecnico del OAuth pasa primero por Supabase:

```txt
https://tohjzoncoosvjbjcakdl.supabase.co/auth/v1/callback
```

### Mejora inmediata

En Google Cloud Console:

```txt
APIs y servicios > Pantalla de consentimiento OAuth
```

Configurar:

```txt
App name: Cubitat
Logo: logo oficial de Cubitat
Support email: correo del propietario
Developer contact: correo del propietario
Authorized domain: cubitathome.com
```

Esto mejora la confianza visual, aunque Google todavia puede mostrar el dominio tecnico de Supabase como destino del callback.

### Mejora final

Cuando el dominio este listo, configurar un dominio propio para Auth:

```txt
auth.cubitat.com
```

Objetivo:

```txt
Google OAuth > Supabase Auth custom domain > Cubitat
```

Con eso se reemplaza el callback visible:

```txt
https://tohjzoncoosvjbjcakdl.supabase.co/auth/v1/callback
```

por uno de marca:

```txt
https://auth.cubitat.com/auth/v1/callback
```

### Criterio de cierre

- Google muestra `Cubitat` como nombre de aplicacion.
- La pantalla de consentimiento tiene logo y correo correcto.
- El callback autorizado de Google usa dominio propio cuando Supabase/DNS lo permitan.
- El login con Google sigue regresando a `/auth/callback?flow=oauth` y entra directo al inicio.

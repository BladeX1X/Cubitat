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

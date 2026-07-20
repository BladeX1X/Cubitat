# AuthCallbackPage

Ruta publica:

```txt
/auth/callback
```

## Objetivo

Recibir el enlace de confirmacion de correo generado por Supabase Auth y cerrar el flujo de verificacion dentro de Cubitat.

## Configuracion esperada en Supabase

Site URL local:

```txt
http://127.0.0.1:5173
```

Redirect URL local:

```txt
http://127.0.0.1:5173/auth/callback
```

Redirect URL produccion:

```txt
https://cubitathome.com/auth/callback
```

## Flujo

1. El usuario se registra desde `LoginModal`.
2. El frontend llama `supabase.auth.signUp` con:

```ts
emailRedirectTo: getAuthRedirectUrl('/auth/callback')
```

3. Supabase genera `{{ .ConfirmationURL }}` en la plantilla de correo.
4. El usuario abre el enlace.
5. Esta pagina es el unico responsable de intercambiar `?code=...` por sesion
   con `supabase.auth.exchangeCodeForSession`. El cliente compartido usa
   `detectSessionInUrl: false` para impedir un segundo intercambio del mismo
   codigo y conservar el verificador PKCE hasta que esta pagina lo consuma.
6. Si Supabase devuelve tokens en `#access_token` / `#refresh_token`, se crea sesion con `supabase.auth.setSession`.
7. Si el callback viene de OAuth (`flow=oauth`, `state` o `provider`), la app limpia la URL y navega directo al inicio sin mostrar pantalla de correo confirmado.
8. Si el callback viene de confirmacion por email, la URL se limpia con `history.replaceState` y se muestra confirmacion con boton para volver al inicio.

## Regla importante

La plantilla HTML de confirmacion debe usar:

```html
{{ .ConfirmationURL }}
```

No escribir manualmente `/auth/callback` dentro del HTML, porque Supabase necesita incluir tokens/codigo de verificacion en el enlace.

No activar `detectSessionInUrl` mientras `AuthCallbackPage` mantenga el
intercambio explicito: ambos mecanismos juntos consumen dos veces el codigo y
el segundo intento termina en `PKCE code verifier not found in storage`.

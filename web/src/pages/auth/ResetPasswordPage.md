# ResetPasswordPage

Ruta publica:

```txt
/recuperar-contrasena
```

## Objetivo

Permitir al usuario crear una nueva contrasena despues de abrir el enlace de recuperacion enviado por Supabase Auth.

## Configuracion esperada en Supabase

Site URL local:

```txt
http://127.0.0.1:5173
```

Redirect URL local:

```txt
http://127.0.0.1:5173/recuperar-contrasena
```

Redirect URL produccion:

```txt
https://cubitat.com/recuperar-contrasena
```

## Flujo

1. El usuario pulsa `Olvide mi contrasena` en `LoginModal`.
2. El frontend llama:

```ts
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: getAuthRedirectUrl('/recuperar-contrasena'),
})
```

3. Supabase genera `{{ .ConfirmationURL }}` en la plantilla de recuperacion.
4. El usuario abre el enlace.
5. Esta pagina intercambia `?code=...` por sesion o usa tokens en hash si Supabase los envia.
6. La URL se limpia para no dejar codigos o tokens visibles.
7. Solo si hay sesion valida de recuperacion se habilita el formulario de nueva contrasena.
8. La contrasena se guarda con `supabase.auth.updateUser({ password })`.
9. Despues de guardar, se ejecuta `supabase.auth.signOut()` para cerrar la sesion temporal de recuperacion.
10. La app vuelve al inicio y abre el modal de login para que el usuario entre con su nueva contrasena.

## Regla importante

El formulario no debe quedar habilitado si el usuario llega manualmente a `/recuperar-contrasena` sin abrir el enlace del correo.

Despues de actualizar la contrasena, el usuario no debe quedar logueado automaticamente. Debe volver a autenticarse desde el modal de login.

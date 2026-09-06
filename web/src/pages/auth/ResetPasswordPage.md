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
https://cubitathome.com/recuperar-contrasena
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
5. La plantilla preferida entrega `?token_hash=...&type=recovery`; la página llama `verifyOtp` para crear la sesión sin depender del navegador que solicitó el correo. Se conserva compatibilidad con `?code=...` y tokens en hash antiguos.
6. La URL se limpia para no dejar codigos o tokens visibles.
7. Solo si el enlace genera el evento `PASSWORD_RECOVERY` o incluye `type=recovery` y existe una sesion valida se habilita el formulario. Una sesion normal ya abierta no es suficiente.
8. Si la cuenta tiene un factor TOTP verificado y la sesion de recuperacion queda
   en `aal1`, la pagina pide el codigo de 6 digitos y eleva la sesion con
   `supabase.auth.mfa.challengeAndVerify`.
9. La contrasena se guarda con `supabase.auth.updateUser({ password })`.
10. Despues de guardar, se ejecuta `supabase.auth.signOut()` para cerrar la sesion temporal de recuperacion.
11. La app vuelve al inicio y abre el modal de login para que el usuario entre con su nueva contrasena.

## Regla importante

El formulario no debe quedar habilitado si el usuario llega manualmente a `/recuperar-contrasena` sin abrir el enlace del correo.

Despues de actualizar la contrasena, el usuario no debe quedar logueado automaticamente. Debe volver a autenticarse desde el modal de login.

Si Supabase devuelve `AAL2 session is required...`, la interfaz no debe mostrar
ese mensaje tecnico. Debe pedir el segundo factor o mostrar un error seguro en
espanol.

La fortaleza se valida mediante la politica compartida de
`src/modules/auth/passwordPolicy.ts`: minimo 8 caracteres con mayuscula,
minuscula, numero y simbolo. Supabase Auth aplica la misma regla en servidor.

El cambio de contrasena tambien atraviesa el Worker y consulta Pwned Passwords
mediante k-anonimato. Una contrasena conocida en filtraciones se rechaza antes
de llegar a Supabase; la contrasena y su hash completo nunca salen del Worker.

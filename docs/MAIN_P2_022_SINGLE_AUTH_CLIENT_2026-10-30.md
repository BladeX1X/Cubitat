# MAIN-P2-022 — un solo cliente Supabase Auth en recuperación

Fecha: 2026-10-30 (CDMX)  
Estado: implementado en rama aislada; PR/CI pendientes.  
Entornos hosted: no probados ni modificados.

## Hallazgo

La app creaba `supabase` y `supabaseRecovery` con la misma `storageKey` y ambos
persistían sesión en el mismo `localStorage`. En recuperación por `token_hash`,
la segunda instancia verificaba el OTP; luego la primera leía y usaba esa
sesión. La inicialización de GoTrue detectó clientes concurrentes bajo la
misma clave.

## Remediación

- Eliminada la segunda llamada a `createClient`.
- Registro, recuperación, verificación OTP, intercambio PKCE, MFA y cambio de
  contraseña usan ahora el singleton `supabase`.
- `verifyOtp({ token_hash, type: 'recovery' })` guarda la sesión que luego lee
  `getSession()` desde el mismo cliente y `storageKey`.
- El cliente conserva `flowType: 'pkce'`, `detectSessionInUrl: false` y el
  callback manual. Las rutas de código y fragmento legacy continúan pasando
  por sus métodos existentes del singleton.
- Actualizadas las pruebas `supabaseClient`, `ResetPasswordPage` y
  `captchaAuth`, el Markdown del componente y OpenSpec Auth.

Supabase documenta `verifyOtp` como mecanismo de inicio de sesión con el
`token_hash` entregado por correo y muestra su uso con un único cliente:
[referencia `verifyOtp`](https://supabase.com/docs/reference/javascript/auth-verifyotp),
[guía React Auth](https://supabase.com/docs/guides/auth/quickstarts/react).

## Evidencia local

- TDD: los tests actualizados fallaron antes del cambio porque se construían
  dos clientes y el componente llamaba a la instancia retirada.
- Pruebas focales de los tres módulos: 8/8 PASS.
- Gates finales: `npm run lint` PASS; 154 archivos Vitest, 677 PASS y 1 SKIP;
  `SITEMAP_MODE=static npm run build` y verificadores PASS.
- Build TypeScript encontró una llamada adicional en `captchaAuth.ts`; se
  actualizó al singleton y el build completo pasó en el segundo ciclo.
- No hubo envío de correos ni verificación OTP real; ningún servicio hosted se
  consultó o alteró.

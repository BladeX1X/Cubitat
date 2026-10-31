# P2-009: endurecimiento del reenvío de confirmación

Fecha: 2026-10-31  
Entorno: cambio local aislado sobre `main`; sin despliegue remoto.

## Cambio

- El reenvío requiere un Turnstile nuevo con acción `resend-confirmation`.
- El Worker limita por IP (5 solicitudes/10 minutos) y reserva cuota por SHA-256 del correo normalizado (3/hora); el correo en claro no forma parte de la clave de cuota.
- Para una cuenta pendiente, el Worker entrega el token a Supabase Auth para que lo valide en la operación de reenvío. Para una cuenta confirmada, lo valida mediante el servicio Turnstile compartido antes de enviar el correo de orientación.
- Si Supabase Auth informa específicamente `captcha_failed`, el Worker libera de manera idempotente la reserva de email en el Durable Object. Las solicitudes que exceden el cupo no siguen incrementando el contador. Otros fallos no liberan la reserva porque el resultado de entrega podría ser incierto.
- El endpoint responde de forma genérica ante direcciones desconocidas y fallos de entrega. Una caída del verificador en el camino de cuenta confirmada también responde genéricamente para no revelar el estado de la cuenta.
- El frontend reinicia el widget al finalizar la solicitud. No envía la solicitud sin token.

## Evidencia local

- Pruebas focales de Worker, `rate-limiter.test.ts` y `LoginModal.captcha.test.tsx`: 74/74 aprobadas el 2026-10-31; incluyen rechazo de token, liberación de reserva idempotente, reintento con token nuevo, límites por IP/email y fallos de proveedores.
- Ciclo local: lint PASS; Vitest 155 archivos, 700 PASS y 1 SKIP. `npm run build` con `SITEMAP_MODE=static` PASS en TypeScript, bundling y guards; genera solo las 2 rutas estáticas. `npm run build` normal requiere `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para generar sitemap dinámico, variables ausentes en este entorno. Sitemap/robots versionados se restauraron después del build estático.
- Pendiente integrar a `main` y verificar CI.

## Despliegue

No desplegar hasta cerrar el gate de reconciliación de migraciones DEV descrito en `web/supabase/DEV_MIGRATION_RECONCILIATION_2026-10-30.md`. No se modificó Supabase ni se tocó producción. La reserva compensada puede bloquear brevemente otra solicitud concurrente mientras Auth valida; una caída del Durable Object durante la compensación puede dejar la reserva hasta que expire la hora. Esta limitación queda registrada para revisión posterior.

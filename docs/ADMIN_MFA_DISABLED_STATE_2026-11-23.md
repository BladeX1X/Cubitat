# Desactivación de MFA administrativo — 2026-11-23

Estado: **aplicado y verificado en producción**.

- La interfaz administrativa y la recuperación de contraseña ya no solicitan TOTP. Las rutas y acciones administrativas conservan autenticación y el rol `admin`.
- La migración `20261123090000_disable_admin_mfa_requirement.sql` actualiza `public.is_admin_aal2()` para delegar solo en `public.is_admin()`. Los factores TOTP ya enrolados no se eliminaron.
- Preflight: la conexión confirmó el proyecto Cubitat y PostgreSQL 17. Se reconciliaron las 167 versiones remotas con el release completo; el simulacro enumeró únicamente esta migración. No se ejecutó respaldo, conforme a la instrucción expresa del usuario.
- Postcheck: ledger de 168 versiones, migración `20261123090000` registrada y definición de la función confirmada como `SELECT public.is_admin()`.
- Supabase CLI avisó que no pudo exportar su caché pg-delta por faltar un certificado auxiliar; terminó la aplicación y el postcheck directo confirmó el esquema y el ledger.
- App/Worker `cubitat1` desplegado al 100 %: versión `0d79f4a9-9947-4b20-8eb1-91b3d887cf2a`. Build `phase4-production`, verificadores del bundle y smoke HTTP de `/`, `/moderar` y `/recuperar-contrasena`: correctos. El índice servido coincide con el build y el chunk administrativo responde 200.
- Gates locales: lint; 248 archivos de pruebas, 1,134 aprobadas y 1 omitida; build de producción Fase 4 y verificadores aprobados.
- Pendiente: QA autenticado en `/moderar` con una cuenta admin AAL1 y revisión de si Supabase Auth impone AAL2 independientemente durante recuperación de contraseña.
- Seguridad operativa: la contraseña temporal se compartió en el chat; rotarla y actualizar el secreto de despliegue correspondiente. No se almacena aquí.

Reactivar 2FA en el futuro requiere un release coordinado que restaure la validación AAL2 en app, Worker y base de datos.
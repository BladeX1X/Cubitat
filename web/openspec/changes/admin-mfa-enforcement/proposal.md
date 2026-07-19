# MFA obligatorio para administración

## Problema

El rol administrativo abre el panel y autoriza acciones sensibles con una sesión
de primer factor (`aal1`). Si una contraseña o sesión se compromete, el atacante
puede consultar información privada, moderar publicaciones y resolver reportes.

## Objetivo

- Exigir TOTP y una sesión `aal2` antes de mostrar cualquier dato administrativo.
- Bloquear en Worker, RPC y RLS las acciones administrativas realizadas con `aal1`.
- Mantener intactos los permisos legítimos de propietarios y usuarios normales.
- Encapsular enrolamiento y desafío en un módulo MFA independiente de moderación.

## Fuera de alcance

- Obligar MFA a usuarios que no sean administradores.
- Leer, registrar o persistir secretos TOTP, códigos o contenido del QR.
- Recuperación de un segundo factor perdido; requiere un procedimiento operativo
separado con comprobación de identidad.

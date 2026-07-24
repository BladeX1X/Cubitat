# Recuperación del segundo factor administrativo

Estado: procedimiento operativo documentado el 2026-07-19. No se ha ejecutado
una eliminación real de factores en producción.

## Objetivo y alcance

Este runbook recupera el acceso de un administrador de Cubitat que perdió todos
sus factores TOTP. No sirve para recuperar una contraseña, cambiar roles ni
crear administradores. El enforcement `aal2` debe permanecer activo durante todo
el incidente.

Supabase no ofrece códigos de recuperación. Admite varios factores, pero la
interfaz actual de Cubitat todavía no permite elegir entre varios factores ni
administrarlos. Hasta que exista y se pruebe esa capacidad, la recuperación
total se realiza eliminando únicamente el factor perdido mediante la API Admin
de Supabase y matriculando uno nuevo. La versión instalada de `auth-js` marca
estas operaciones administrativas de MFA como experimentales; se deben volver
a comprobar después de cada actualización relevante del SDK.

Referencias oficiales:

- [MFA en Supabase](https://supabase.com/docs/guides/auth/auth-mfa)
- [Listar factores con la API Admin](https://supabase.com/docs/reference/javascript/auth-admin-listfactors)
- [Eliminar un factor con la API Admin](https://supabase.com/docs/reference/javascript/auth-admin-deletefactor)
- [Matricular un factor TOTP](https://supabase.com/docs/reference/javascript/auth-mfa-enroll)

## Reglas obligatorias

- Requiere autorización explícita del propietario del proyecto y verificación
  de identidad por dos evidencias independientes.
- La operación administrativa se ejecuta solo en un entorno local o backend
  controlado. La clave `service_role` nunca se pega en navegador, chat, ticket,
  comando, captura, log ni archivo versionado.
- No desactivar TOTP, el guard, RLS, RPC ni la validación AAL2 para recuperar una
  cuenta.
- No cambiar el rol, correo o contraseña y no eliminar el usuario.
- No crear una cuenta administrativa de emergencia sin autorización separada.
- No registrar QR, secreto TOTP, códigos, tokens, cookies ni identificadores
  completos de factores en la documentación del incidente.
- Si la identidad o el usuario objetivo no se pueden confirmar, detener el
  procedimiento sin realizar cambios.

## Evidencias de identidad aceptables

Usar dos categorías distintas y registrar solamente cuáles se comprobaron:

1. Control de la cuenta principal asociada al administrador.
2. Control del repositorio u organización de GitHub de Cubitat.
3. Control del proyecto vinculado de Supabase o de la cuenta de Cloudflare.
4. Confirmación directa del propietario del proyecto por un canal previamente
   acordado.

No copiar el contenido de correos, códigos o credenciales al registro.

## Procedimiento de emergencia

### 1. Abrir el incidente

Registrar fecha UTC, solicitante, operador, motivo, evidencias de identidad y
autorización. Pausar acciones de moderación mientras se recupera el acceso; la
web pública continúa operativa.

### 2. Confirmar el usuario sin modificarlo

En el proyecto correcto de Supabase, localizar el usuario por el identificador
interno ya conocido y comprobar su rol en `public.profiles`. No buscar por datos
aproximados ni asumir que una dirección parecida corresponde al administrador.

### 3. Inspeccionar factores desde servidor

Usar `supabase.auth.admin.mfa.listFactors({ userId })` con un cliente de servidor
creado con `persistSession: false`, `autoRefreshToken: false` y la credencial
`service_role` obtenida desde el almacén seguro del operador. Mostrar únicamente
tipo, estado y fecha; mantener los identificadores completos dentro de la sesión
controlada.

Confirmar que el factor seleccionado pertenece al usuario exacto, es TOTP y
está `verified`. Si aparecen varios factores o cualquier dato no coincide,
detenerse y escalar la revisión.

### 4. Eliminar solo el factor perdido

Tras una segunda confirmación del usuario y del factor, ejecutar
`supabase.auth.admin.mfa.deleteFactor({ userId, id })`. La documentación oficial
indica que eliminar un factor verificado cierra todas las sesiones activas del
usuario. No eliminar factores adicionales.

### 5. Matricular el reemplazo

1. El propietario inicia sesión normalmente en `https://cubitathome.com/`.
2. Abre `/moderar`; en `aal1` no debe ver datos administrativos.
3. Pulsa **Configurar app autenticadora**, escanea el QR en el dispositivo nuevo
   y confirma el código actual.
4. No captura ni guarda el QR o el secreto fuera de la app autenticadora.
5. Verifica que la sesión sube a `aal2` y que el panel carga.

### 6. Validar y cerrar

- Confirmar que una sesión `aal1` continúa sin acceso administrativo.
- Confirmar con el factor nuevo que `/moderar`, métricas, reportes y bitácora
  funcionan en `aal2`.
- Revisar la consola y los logs sin exponer credenciales.
- No ejecutar moderaciones ni modificar publicaciones durante la comprobación.
- Registrar resultado, hora de cierre y cualquier anomalía. No registrar el
  factor ID, QR, secreto, código TOTP ni tokens.

## Criterios de cancelación y escalado

Cancelar sin cambios si falta autorización, hay dudas sobre la identidad, el
usuario no coincide o existen varios factores cuya propiedad no puede
determinarse. Si la eliminación falla, conservar AAL2 activo y revisar logs/API;
no intentar corregirlo con SQL directo sobre `auth.mfa_factors`.

## Prevención y trabajo pendiente

- Mantener MFA también en las cuentas de Supabase, GitHub y Cloudflare que
  permiten ejecutar esta recuperación.
- Implementar en una tarea separada selección y gestión segura de varios
  factores. Solo entonces matricular y probar un segundo TOTP de respaldo.
- Hacer un simulacro no destructivo trimestral: revisar accesos, responsables y
  pasos, sin borrar factores productivos.
- Revisar este documento cuando cambie la API Admin de Supabase o el flujo MFA
  de Cubitat.

## Plantilla mínima del registro

```text
Inicio UTC:
Solicitante:
Operador:
Motivo:
Evidencias de identidad comprobadas (categorías, sin contenido sensible):
Autorización registrada:
Usuario objetivo confirmado: sí/no
Cantidad y estado de factores observados:
Factor perdido eliminado: sí/no
Todas las sesiones cerradas: sí/no
Nuevo TOTP matriculado: sí/no
AAL1 denegado y AAL2 verificado: sí/no
Fin UTC:
Incidencias o seguimiento:
```

## Registro de simulacros no destructivos

### Simulacro 2026-07-21 — Validación de contrato y aislamiento

```text
Inicio UTC: 2026-07-21 16:30:00
Solicitante: Proyecto Cubitat
Operador: Codex / Rodolfo
Motivo: Simulacro trimestral no destructivo de recuperación MFA (Carril Q).
Evidencias de identidad comprobadas: Control de repositorio GitHub y proyecto Supabase.
Autorización registrada: Sí.
Usuario objetivo confirmado: Sí (no se aplicó mutación en producción).
Cantidad y estado de factores observados: 1 factor TOTP verificado en cuenta admin QA.
Factor perdido eliminado: No (simulacro no destructivo sin alteración de datos).
Todas las sesiones cerradas: N/A (sin mutación).
Nuevo TOTP matriculado: N/A (sin mutación).
AAL1 denegado y AAL2 verificado: Sí (verificado por suite automatizada 8/8 pruebas aprobadas en AdminMfaGate.test.tsx y admin-mfa-migration.test.ts).
Fin UTC: 2026-07-21 16:31:00
Incidencias o seguimiento: Contratos de SDK y API Admin de Supabase validados. 0 factores modificados.
```


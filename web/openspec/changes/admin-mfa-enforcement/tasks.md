# Checklist de implementación

- [x] Documentar casos de uso, arquitectura, datos y casos borde.
- [x] Añadir escenarios a las especificaciones de autenticación y administración.
- [x] Escribir pruebas del guard MFA, Worker y migración.
- [x] Implementar `src/modules/auth/mfa` e integrar `AdminMfaGate`.
- [x] Exigir `aal2` en endpoints administrativos del Worker.
- [x] Crear y validar migración 47 con enforcement RLS/RPC.
- [x] Habilitar enrolamiento y verificación TOTP en configuración Auth.
- [x] Ejecutar lint, pruebas y build.
- [x] Desplegar y verificar denegación `aal1` y acceso `aal2` en producción.
- [x] Actualizar handoff, inventario de migraciones y notas afectadas del vault.

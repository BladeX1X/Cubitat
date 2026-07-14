# Checklist de implementación

- [x] Añadir escenarios Gherkin a la especificación de administración.
- [x] Escribir pruebas que fallen para migración, Worker y módulo UI.
- [x] Crear tabla, constraints, índices, RLS y guard de inmutabilidad.
- [x] Crear trigger atómico sobre `properties`.
- [x] Crear RPC IA exclusivo de `service_role` y endurecer el Worker.
- [x] Implementar `src/modules/admin/audit-log` sin dependencias internas de otros módulos.
- [x] Integrar solo navegación/render en `AdminPage`.
- [x] Ejecutar lint, pruebas y build.
- [x] Actualizar documentación técnica, handoff y notas afectadas del vault.
- [ ] Aplicar migración y verificar roles en producción únicamente tras autorización.

# Dependencia auditada: advisory retirado de picomatch — 2026-11-18

## Estado comprobado

- GitHub retiró el advisory `GHSA-fc5q-39xc-vjpf` el 2026-11-18. La página del advisory indica que se retiró tras una disputa técnica: <https://github.com/advisories/GHSA-fc5q-39xc-vjpf>.
- El registro npm todavía devuelve ese mismo advisory al ejecutar `npm audit`; no ha sincronizado el retiro.
- npm continúa ofreciendo `picomatch` 4.0.7 como `latest`. No se encontró una versión oficial posterior que se pueda identificar como versión corregida.
- El `picomatch` señalado solo aparece en la cadena de herramientas de desarrollo en este proyecto. `npm audit --omit=dev --audit-level=high` no encuentra vulnerabilidades de alta severidad en dependencias de producción.

## Comportamiento del gate

CI ejecuta primero una auditoría de dependencias de producción, que permanece bloqueante. Luego `web/scripts/audit-withdrawn-advisories.mjs` ejecuta la auditoría completa y permite únicamente el URL exacto del advisory retirado mientras siga apareciendo en npm. Un error de red, un informe inválido o cualquier otro advisory alto/crítico detiene el gate. La excepción se debe retirar cuando el informe npm deje de contener el advisory.

Esto no instala un parche de `picomatch` ni certifica una versión corregida. Evita que el feed npm desactualizado contradiga la retirada visible en GitHub, manteniendo el control de otras vulnerabilidades.

## Verificación local

- `npm run lint`: PASS.
- `npm run test:run`: 248 archivos, 1,131 pruebas PASS y 1 omitida.
- `npm run build`: PASS.
- Builds `phase2-dev`, `phase34-dev`, `phase2-documents`, `phase2-production:ci`, `phase3-production:ci` y `phase4-production:ci`: PASS.
- Prueba focal del filtro del advisory: 3/3 PASS.
- Auditoría de producción: 0 vulnerabilidades.
- No se desplegó código a DEV ni a producción; quedan push, CI y revisión del artefacto antes de promocionar.

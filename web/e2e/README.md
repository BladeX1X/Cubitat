# Pruebas E2E con cuentas reales

Las pruebas que escriben datos quedan omitidas por defecto. Para ejecutarlas se
requieren variables de entorno locales; nunca se deben escribir credenciales en
los archivos del repositorio.

Variables requeridas:

- `CUBITAT_E2E_EMAIL`: cuenta QA aislada.
- `CUBITAT_E2E_PASSWORD`: contraseña de la cuenta QA.
- `CUBITAT_E2E_ALLOW_MUTATIONS=true`: autorización explícita para crear y
  limpiar datos QA.
- `CUBITAT_E2E_BASE_URL`: destino opcional. Por defecto usa
  `http://localhost:5173`.

Las pruebas mutables deben usar un marcador único, localizar exactamente la fila
creada y limpiarla. Está prohibido eliminar la primera o la última fila de una
cuenta, porque podría pertenecer a otra ejecución o a un usuario real.

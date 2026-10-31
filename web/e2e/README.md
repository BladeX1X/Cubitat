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
  `http://127.0.0.1:5174`.
- `CUBITAT_E2E_SUPABASE_URL`: Supabase destino. Por defecto las pruebas que lo
  necesitan usan `http://127.0.0.1:54321`; no existe un fallback alojado.
- `CUBITAT_E2E_ALLOW_CLOUD=true`: excepción explícita para una ejecución
  manual contra una app y Supabase alojados. Ambos destinos deben declararse,
  usar HTTPS y pertenecer al mismo ámbito (local o alojado).
  `security.spec.ts` permanece restringido a loopback incluso con esta opción.

Las pruebas mutables deben usar un marcador único, localizar exactamente la fila
creada y limpiarla. Está prohibido eliminar la primera o la última fila de una
cuenta, porque podría pertenecer a otra ejecución o a un usuario real.

Las pruebas con escrituras validan además que tanto la app como Supabase usen
loopback. No se habilitan escrituras contra DEV ni producción con variables de
entorno. Para pruebas E2E habituales, inicia Supabase local (`npx supabase
start`) antes de ejecutar la suite.

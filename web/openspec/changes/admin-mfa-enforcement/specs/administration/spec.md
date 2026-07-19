# Delta: Enforcement AAL2 administrativo

### Requirement: Acciones administrativas con segundo factor
Las funciones administrativas sensibles MUST validar rol admin y `aal2` en backend.

#### Scenario: Admin AAL1 intenta omitir la interfaz
- GIVEN una sesión válida con rol admin y `aal1`
- WHEN consulta datos privados, métricas, bitácora o intenta moderar
- THEN Worker, RPC o RLS MUST denegar la operación

#### Scenario: Admin AAL2 modera contenido
- GIVEN una sesión válida con rol admin y `aal2`
- WHEN consulta el panel o ejecuta una acción de moderación
- THEN el backend MUST autorizarla conforme a las demás políticas vigentes

#### Scenario: Propietario administra su publicación
- GIVEN un usuario normal propietario de una publicación
- WHEN usa una función legítima reservada al propietario
- THEN el enforcement administrativo MUST NOT exigirle `aal2`

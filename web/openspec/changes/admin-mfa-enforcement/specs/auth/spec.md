# Delta: Segundo factor administrativo

### Requirement: TOTP obligatorio para administradores
El sistema MUST exigir una sesión `aal2` antes de permitir acceso administrativo.

#### Scenario: Admin sin factor configura TOTP
- GIVEN un usuario con rol admin y sesión `aal1` sin factor verificado
- WHEN abre el panel y confirma un código válido de su app autenticadora
- THEN el sistema MUST verificar el factor y elevar la sesión a `aal2`
- AND MUST evitar registrar o persistir QR, secreto y código

#### Scenario: Admin con factor inicia una sesión nueva
- GIVEN un usuario admin con TOTP verificado y sesión actual `aal1`
- WHEN abre el panel administrativo
- THEN MUST ver un desafío de segundo factor en lugar de datos administrativos
- AND solo MUST acceder después de elevar la sesión a `aal2`

# Diseño

## Casos de uso

1. Un administrador sin factor verificado abre `/moderar`, configura una app
   autenticadora, escanea el QR y confirma un código de seis dígitos.
2. Un administrador con factor verificado inicia una sesión nueva en `aal1` y
   debe superar el desafío TOTP antes de acceder al panel.
3. Un administrador en `aal1` intenta saltarse la interfaz y recibe denegación
   en Worker, RPC y políticas RLS.
4. Un propietario sigue administrando sus propias publicaciones sin que las
   reglas administrativas de segundo factor interfieran.

## Arquitectura modular

`src/modules/auth/mfa` contiene el cliente de Supabase MFA y `AdminMfaGate`.
`AdminPage` conserva el guard de rol existente y envuelve el contenido del panel
con ese componente. El módulo de moderación no conoce QR, factores ni desafíos.

El enrolamiento se inicia únicamente tras una acción explícita. Los factores
TOTP no verificados y abandonados se eliminan antes de crear uno nuevo. El QR
solo vive en estado de React durante el enrolamiento, no se escribe en storage,
logs ni documentación. La interfaz no muestra el secreto textual.

## Enforcement del backend

La sesión se considera elevada únicamente cuando el JWT ya validado contiene
`aal = 'aal2'`. El Worker exige esa condición a métricas y a cualquier uso
administrativo de reevaluación IA. Un propietario conserva su flujo legítimo de
reevaluación sobre su propia publicación.

La migración 47 crea `is_aal2()` e `is_admin_aal2()` y reemplaza las ramas admin
de las políticas para propiedades, perfiles, contactos, reportes y bitácora.
`get_admin_metrics()` comprueba explícitamente `is_admin_aal2()`. Las operaciones
confiables de automatización mediante `service_role` no cambian.

## Estados y errores

- Carga: no se renderiza contenido administrativo.
- `aal1` sin factor: explicación y botón para configurar TOTP.
- `aal1` con factor: formulario de desafío TOTP.
- `aal2`: panel administrativo.
- Código inválido, red o configuración deshabilitada: mensaje seguro y reintento.
- Factor no verificado abandonado: se limpia antes de un enrolamiento nuevo.

## Rollback

Una migración posterior puede restaurar las políticas anteriores y la función
de métricas. El guard UI se puede retirar de forma independiente. Desactivar
TOTP en Auth solo debe hacerse después de retirar el enforcement AAL2 para no
bloquear a todos los administradores.

# F4-BIZ: beneficios comerciales manuales

## Propósito

Registrar concesiones comerciales que una persona administradora otorga de
forma manual a una cuenta o publicación. No procesa ni representa pagos. Cada
beneficio tiene un código estable que otros módulos pueden consultar sin leer
las tablas propias de F4-BIZ.

## Requisitos

### Concesión

- **WHEN** una persona administradora autenticada con AAL2 concede un beneficio
- **THEN** se conserva el objetivo, código, inicio, expiración, responsable y
  motivo no vacío
- **AND** la operación crea un evento en la auditoría propia de F4-BIZ
- **AND** no se guarda ni se infiere un pago

### Revocación y vencimiento

- **WHEN** una persona administradora con AAL2 revoca un beneficio activo
- **THEN** se conserva la concesión original y se registra actor, momento y
  motivo de revocación en un evento de auditoría
- **AND** una concesión deja de estar activa al vencer `expires_at`, sin tarea
  programada ni actualización destructiva

### Consulta por los módulos anfitriones

- **WHEN** un módulo solicita los beneficios activos para un objetivo conocido
- **THEN** recibe solo códigos de beneficio y sus fechas de vigencia
- **AND** la respuesta no incluye responsable, motivo, revocación ni datos de
  otras concesiones
- **AND** los beneficios de cuenta solo pueden consultarse por la propia
  cuenta autenticada; los beneficios de publicaciones/perfiles conocidos
  devuelven únicamente los códigos y fechas previstos para su presentación
- **AND** la RPC de consulta es de solo lectura y no crea dependencia en tablas
  de F4-SVC o F4-MAT

### Seguridad

- Las tablas y bitácora son privadas y tienen RLS.
- Lectura administrativa, concesión, revocación y cola requieren `is_admin_aal2()`.
- `anon` no puede leer tablas ni invocar RPC administrativas.
- La consulta pública tipada acepta solo el objetivo/códigos admitidos y no
  devuelve datos personales.

## Alcance no incluido

- Procesamiento de pagos, facturas, renovaciones o cobros recurrentes.
- Precio publicado de un plan, activación comercial o promesas de retorno.
- Consumo automático de códigos por SVC/MAT; esos módulos pueden integrarlo
  después mediante `get_active_business_benefits`.

La valoración es un módulo separado en `../phase4-valuation/spec.md`.

## Persistencia y contratos

- F4-BIZ es dueño de `business_benefits` y `business_benefit_audit`.
- Objetivos: `account`, `service_profile` y `material_listing`, identificados
  por UUID opaco sin FK ni lectura directa de las tablas anfitrionas.
- La expiración debe ser posterior al inicio y futura al momento de conceder.
- Códigos: `listing_featured`, `profile_featured`, `priority_contact` y
  `commercial_badge`.
- RPC administrativa: cola AAL2, concesión AAL2 y revocación AAL2.
- RPC de consumo: `get_active_business_benefits(target_type, target_id, at)`;
  devuelve código y límites temporales, sin datos de auditoría.
- La integración visual del panel con el shell/AdminPage es responsabilidad del
  propietario de F4-SHELL; este módulo entrega un componente autocontenido.

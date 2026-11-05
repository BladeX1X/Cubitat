# BusinessBenefitsTab

## Responsabilidad

Administrar concesiones comerciales manuales de F4-BIZ. Lista los beneficios,
permite conceder uno a una cuenta/perfil/publicación UUID y revocar concesiones
con motivo. Requiere el `AdminMfaGate` del panel anfitrión y validación AAL2
independiente en las RPC.

## Contrato

- Usa exclusivamente `get_admin_business_benefits`, `grant_business_benefit` y
  `revoke_business_benefit` del repositorio F4-BIZ.
- Los motivos se conservan y se muestran solo en la interfaz administrativa.
- Vigencia expirada se deriva de las fechas y no requiere mutar la fila.
- No inicia pagos ni declara que hubo pago.

## Integración

El componente es autónomo. La conexión como panel al `AdminPage` se reserva a
F4-SHELL, propietario del punto de composición compartido; no importa ni edita
tablas de SVC/MAT.

## Verificación

Revisar concesión, revocación, expiración y errores AAL2 en DEV durante un turno
exclusivo. No crear concesiones de QA sin coordinar datos con el responsable del
turno.

# Moderación de captación y comisiones

## Responsabilidad

`AgentGrowthModerationTab` es la interfaz administrativa del módulo G, cargada
dentro del `AdminMfaGate`. Compone el contrato de oportunidades D y comisiones
E; los repositorios de dominio ejecutan lecturas y RPCs, no esta interfaz ni su
compositor.

## Autorización y contabilidad

- El shell visual requiere rol admin y MFA AAL2; cada RPC y política de base de
  datos vuelve a comprobar AAL2.
- No existe tasa por defecto. Un administrador especifica monto elegible, tasa
  y moneda por referencia de operación; PostgreSQL calcula el monto.
- `Registrar pago` guarda una referencia proporcionada por el operador. No
  inicia ni confirma transferencia mediante una integración bancaria.
- Una comisión o evento de seguimiento no se elimina ni se reescribe en la UI;
  los cambios quedan en tablas de eventos append-only.
- La interfaz muestra el historial de estados con fecha, actor, transición y
  motivo a partir de las tablas de eventos privadas para administración AAL2.

## Verificación

Las pruebas comprueban el contrato del cálculo solicitado por UI, que convertir
requiere motivo y que los errores no exponen detalles internos. La verificación
real en Supabase DEV queda para la ronda de pruebas por módulo.

Las consultas de oportunidades y comisiones conservan estados independientes: si una falla, la otra sección sigue visible y la sección pendiente no se presenta como vacía.

La reapertura de una oportunidad `lost` está reservada a una sesión admin AAL2 y requiere un motivo, que se conserva en el evento inmutable. La base de datos vuelve a aplicar ambos controles.
# Fase 3 — checklist de implementación

Fecha de revisión: 2026-11-03  
Estado: reglas provisionales de acceso y CV confirmadas; implementación y release productivo pendientes.

Esta lista convierte las decisiones del dueño y la propuesta técnica en tareas verificables. Los ítems marcados `[x]` son solo decisiones o análisis documentados; no implican funcionalidad implementada.

## 0. Decisiones confirmadas y bloqueos

- [x] Convocatoria abierta; selección manual; máximo 4 agentes activos por provincia principal.
- [x] Grado de nivel superior como requisito; experiencia de gestión de procesos/documentos como mérito, no requisito.
- [x] CV enviado por correo; enlace único por agente; atribución al registro.
- [x] Comisión del 20% por cada pago de cuenta atribuida, incluidos pagos de renovación, ajustada por reembolsos.
- [x] Prueba de 30 días una vez por cuenta, sin método de pago al iniciarla.
- [x] Precios confirmados en CUP: natural 200 trimestral / 500 anual; jurídica 10 000 trimestral / 30 000 anual.
- [x] Regla provisional de acceso: todas las funciones actuales siguen gratuitas; no cobrar, activar paywall ni bloquear automáticamente al vencer una prueba. La matriz final queda pendiente antes de monetizar.
- [x] La suscripción jurídica será por empresa, incluye hasta 10 usuarios en total contando al administrador; un administrador de empresa gestiona los asientos.
- [x] Al retirar un miembro, conserva acceso premium hasta el final del período pagado; vencimiento/cancelación aplica simultáneamente a todos los miembros.
- [x] El pago del usuario será por transferencia con comprobante; un administrador confirma el ingreso y activa la suscripción dejando auditoría, dentro de 24 horas.
- [x] Para aprobar el pago, el administrador confirma el abono en el estado de cuenta bancario; el comprobante del usuario no basta por sí solo.
- [x] Si el comprobante se rechaza o el importe no coincide, se avisa al usuario y se le permite enviar otro comprobante.
- [x] Si la prueba ya venció y la transferencia está en revisión dentro del SLA de 24 horas, se conserva acceso provisional.
- [x] La base del 20% descuenta únicamente reembolsos; impuestos, descuentos y tarifas del procesador no se descuentan según la respuesta recibida.
- [x] Liquidación mensual por transferencia bancaria el último día del mes, sin mínimo (se transfiere todo el saldo); el administrador registra la operación y conserva referencia/comprobante.
- [x] Si un reembolso llega después de que la comisión fue pagada al agente, se descuenta de sus futuras comisiones.
- [x] Contracargos se compensan con futuras comisiones; al salir el agente, un saldo negativo se descuenta de otros pagos pendientes y, si no existen, se cierra.
- [x] Correo provisional de CV: `pochiprats18@gmail.com`; formatos PDF/JPG/PNG, máximo 10 MB y eliminación 30 días después de la decisión final. Bucket privado y correo con enlace firmado, sin adjunto.
- [x] Acreditación académica: título o diploma.
- [x] El límite cuenta agentes activos; cada agente tiene una provincia principal.
- [x] El mes gratis comienza al activar el perfil de la persona natural o la empresa.
- [x] El período pagado comienza al confirmarse la transferencia; una renovación se extiende desde la fecha de vencimiento anterior.
- [x] Avisar la renovación 7 días antes por correo y dentro de Cubitat; conceder 3 días de gracia tras el vencimiento.

## 1. A. Postulación, revisión y cupos

- [ ] Especificar campos mínimos y validaciones del formulario; no solicitar datos no necesarios.
- [ ] Crear `agent_applications` con estados, auditoría de cambios y una lista de espera por provincia.
- [ ] Configurar bucket privado para CV; validar formato, tamaño y contenido en servidor; aplicar rate limit/antispam.
- [ ] Configurar bucket privado y validar PDF/JPG/PNG hasta 10 MB en servidor; aplicar rate limit/antispam y eliminar 30 días después de la decisión.
- [ ] Configurar el correo provisional como secreto; notificar con URL firmada breve, sin adjuntar el CV ni incluirlo en logs.
- [ ] Implementar revisión AAL2, comprobación mediante título o diploma, decisión/justificación y eliminación según retención.
- [ ] Asignar cupo de forma transaccional con lock por provincia; impedir que aprobaciones concurrentes excedan cuatro agentes activos.
- [ ] Separar aprobación de postulación de rol/KYC existente: no saltarse verificación para activar panel.
- [ ] Pruebas: solicitud válida/inválida, CV privado, URL expirada, AAL1 denegado, lista de espera y cinco aprobaciones concurrentes para la misma provincia.

**Cierre A:** revisión segura y auditable; evidencia de privacidad del CV y prueba concurrente del límite.

## 2. B/C. Enlace y atribución de altas

- [ ] Definir el formato/rotación/desactivación de código y conservar enlaces existentes sin reactivación implícita.
- [ ] Crear tabla de atribución única e inmutable por cuenta; diseñar corrección excepcional con motivo y auditoría.
- [ ] Integrar `ref` en registro sin confiar en `agent_id` del navegador; resolver código en servidor dentro del alta o flujo idempotente equivalente.
- [ ] Rechazar código inválido/inactivo, autorreferido y atribución tardía a una cuenta existente.
- [ ] Mantener apagado el contador de visitas: clics/visitas no devengan comisión.
- [ ] Pruebas: alta con código válido, inválido, agente inactivo, autorreferido, doble envío, cuenta previa y cambio manipulado del agente desde cliente.

**Cierre B/C:** la cuenta nueva queda atribuida como máximo una vez y la evidencia se origina en el servidor. Los RPC actuales pausados no se reactivan sin sustituir el flujo inseguro de visitas.

## 3. I. Catálogo, prueba y permisos de suscripción

- [ ] Acordar entitlement/matriz de funciones gratis y de pago.
- [ ] Crear catálogo de planes versionado (tipo, período, precio CUP, fechas de vigencia); cambios futuros no alteran historial.
- [ ] Modelar cuenta facturable, suscripción, estado/período, prueba única y registro idempotente de eventos; la suscripción empresarial aplica a todos los miembros, y los miembros retirados conservan acceso hasta el final del período pagado.
- [ ] Implementar regla servidor para otorgar una prueba de 30 días sin tarjeta al activar perfil/empresa y evitar repetición por cuenta.
- [ ] Implementar suscripción/trial solo como estado informativo mientras rija la matriz provisional; vencer trial MUST NOT retirar funciones ni activar cobros.
- [ ] Implementar avisos por correo e in-app 7 días antes, 3 días de gracia y expiración; no automatizar degradación hasta aprobar matriz final. Cubrir zona horaria y reintentos.
- [x] Una cuenta jurídica comparte una sola prueba gratis de 30 días entre todos sus usuarios; el plan incluye hasta 10 usuarios contando al administrador.
- [ ] Pruebas: primera prueba, intento de segunda prueba, aviso a 7 días, 3 días de gracia, vencimiento, renovación con fecha de extensión correcta, cancelación, cuenta suspendida y cliente que altera su estado local.

**Cierre I local:** catálogo y entitlements correctos con reloj/fixtures controlados; cliente no puede concederse acceso.

## 4. Proveedor y cobros (bloqueante para dinero real)

- [x] No se integrará proveedor de pago en la primera etapa; cobro/confirmación será manual. [ ] Si luego se automatiza, confirmar por escrito elegibilidad del comercio y CUP.
- [ ] (Futuro, si se automatiza) Confirmar importes y unidades: la documentación de CuboPago consultada describe `amount` en centavos y muestra moneda USD en ejemplo de suscripción; aclarar cómo representar importes CUP acordados.
- [ ] (Futuro, si se automatiza) Confirmar soporte para cobro por períodos de 3 y 12 meses. La página pública consultada habla de cuotas/cobros mensuales; no asumir que equivale a facturación trimestral/anual.
- [ ] (Futuro, si se automatiza) Confirmar API de pagos, consulta, reembolsos parciales/totales, contracargos, sandbox y firma/autenticación de webhook.
- [ ] Diseñar adaptador Worker con secretos en entorno, límites de datos de tarjeta (preferir checkout/tokenización del proveedor), timeout, idempotencia y manejo de fallos.
- [ ] Implementar recepción autenticada de eventos; verificar firma, importe, moneda, cuenta y referencia; guardar evento original con protección de repetición.
- [ ] Mantener prueba de contrato con respuestas reales del sandbox y reconciliación; nunca activar pago desde la redirección del navegador.
- [ ] No habilitar checkout automático ni integrar proveedor hasta validar elegibilidad, moneda, ciclos y revisión de seguridad.

**Cierre manual inicial:** todo pago reportado queda pendiente hasta que un administrador confirme el ingreso y active la suscripción en un máximo de 24 horas, con evidencia y registro auditado de monto, moneda, cuenta, período, actor y fecha. Si la prueba vence mientras se revisa la transferencia presentada a tiempo, se concede acceso provisional durante la revisión. Si el comprobante se rechaza o el importe no coincide, se notifica y se permite reenviar. El comprobante subido por el usuario inicia la revisión, pero no basta por sí solo para conceder acceso. La automatización con proveedor es una etapa futura independiente.

## 5. E. Ledger recurrente de comisiones

- [ ] Crear ledger nuevo separado del ledger manual de oportunidades; vincular pago confirmado, cuenta atribuida y agente.
- [ ] Impedir más de un asiento de comisión por pago elegible con restricción única.
- [ ] Calcular 20% en servidor sobre cada pago confirmado, descontando únicamente reembolsos; no permitir que agente o navegador envíen el porcentaje/importes calculados.
- [ ] Registrar devoluciones como ajustes negativos append-only, incluidos parciales y eventos duplicados.
- [ ] Modelar disputas, saldo disponible y liquidaciones con historial no editable; ajustes por reembolsos y contracargos posteriores a una liquidación se descuentan de comisiones futuras; sin mínimo, se liquida el último día del mes; al salir, compensar saldo negativo con otros pagos pendientes y cerrar si no existen.
- [ ] Crear operaciones AAL2 para aprobar/conciliar/liquidar; liquidar el último día del mes, registrar transferencia al agente con referencia/comprobante y limitar lectura del agente a sus asientos/saldo.
- [ ] Pruebas: pago único, renovación, registro manual duplicado, reembolso parcial/total, contracargo, compensación de reembolso tras liquidación, agente desactivado, corrección auditada y dos agentes aislados.

**Cierre E:** conciliación matemática entre pagos, devoluciones, comisiones y liquidaciones; acceso aislado por agente y auditoría AAL2.

## 6. F/G. Portal y administración

- [ ] Actualizar panel agente: estado de prueba/plan, fechas, recibos y comisión con estados claros; ocultar datos no implementados.
- [ ] Mantener filtros y carga/error/vacío; errores en un dominio no deben ocultar los demás.
- [ ] Añadir consola de postulaciones/cupos/CV; controlar AAL2, justificar decisiones y auditar.
- [ ] Añadir consola de reconciliación y liquidación AAL2; separar aprobación interna de transferencia efectivamente pagada.
- [ ] Revisar responsive móvil para formulario/CV, tablas, estados y acciones administrativas.
- [ ] E2E por rol: usuario natural, cuenta jurídica, agente, admin AAL1 y admin AAL2; incluir pago reportado y conciliación manual.

## 7. Seguridad, migraciones, despliegue y documentación

- [ ] Añadir OpenSpec de billing y actualizar ownership/dependencias de agentes; definir RPC, RLS, grants, retención y amenazas.
- [ ] Separar migraciones y feature flags por módulo; inventariar cambios en `web/supabase/DATABASE_MIGRATIONS.md`.
- [ ] Revisar secretos, datos de CV, datos del proveedor, webhook/replay, RLS, grants y acceso al service role.
- [ ] Probar migraciones en entorno local efímero; no aplicar migraciones remotas como parte del build.
- [ ] Implementar primero registro manual de pago y conciliación auditada; no conceder acceso premium por comprobante sin validar.
- [ ] Ejecutar desde `web/`: `npm run lint`, `npm run test:run`, `npm run build`; corregir y repetir si falla algo.
- [ ] Probar flujos en DEV por módulo, incluidos reintentos, permisos, móvil y conciliación manual con datos QA; registrar evidencia y límites.
- [ ] Actualizar docs técnicos, checklist operativa, Roadmap/Dashboard/Índice Obsidian con estados `implementado`, `verificado local`, `verificado DEV`; nunca inferir producción desde DEV.
- [ ] Producción solo se considera después de cerrar decisiones legales/comerciales, probar la conciliación manual en DEV, completar revisión de seguridad y recibir autorización explícita. Si se integra un proveedor en el futuro, exigir además sandbox satisfactorio.

## Orden recomendado

1. Resolver decisiones abiertas de funciones, asientos jurídicos, conciliación manual, comisión y CV.
2. Implementar A y comprobar cupos/privacidad.
3. Implementar B/C y probar atribución en alta.
4. Implementar I local con prueba y estados de acceso; después, registro manual de pagos pendientes de conciliación.
5. Implementar E sobre pagos confirmados por conciliación administrativa auditada.
6. Integrar F/G, ejecutar QA móvil y por roles.
7. Completar gates de despliegue y registrar evidencia por ambiente.
8. Considerar integración de proveedor como etapa futura, sujeta a decisión comercial y verificación del proveedor.

## Referencias revisadas

- CuboPago, [Procesar pagos](https://developers.cubopago.com/endpoints/post-payment): el API documenta importe entero en centavos y respuesta de pago `SUCCEEDED`.
- CuboPago, [Crear link de suscripción](https://developers.cubopago.com/endpoints/post-subscription): documenta cuotas mensuales (`installments`) y un ejemplo cuya moneda de respuesta es USD. No confirma CUP ni ciclo trimestral/anual para el comercio de Cubitat.
- Propuesta y decisiones: `docs/FASE3_AGENTES_SUSCRIPCIONES_PROPUESTA.md`.

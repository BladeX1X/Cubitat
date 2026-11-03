# Fase 3 — políticas de agentes, suscripciones y comisiones

Fecha: 2026-11-03  
Estado: reglas provisionales actualizadas; promoción productiva en preparación, no desplegada.  
Entorno: producción inspeccionada en modo solo lectura; no se cambiaron datos ni esquema.

## Avance del candidato — 2026-11-03

La rama `feature/phase3-production-main` y el PR borrador #186 incorporan
intake autenticado DEV, carga privada CV/título, acceso administrativo de corta
duración a documentos y cola de moderación paginada bajo `AdminMfaGate`. Se
añadió una RPC para iniciar revisión, enviar a lista de espera y rechazar con
motivo, exigiendo AAL2 en PostgreSQL y registrando eventos inmutables. El rechazo
programa la eliminación a 30 días. No existe aún purga automática, correo ni
aprobación; la aprobación espera el control transaccional del cupo de cuatro
agentes activos por provincia.

La migración candidata `20261103140000_agent_application_email_outbox.sql`
prepara un outbox privado, encolado en la transacción de intake. Un cron DEV
condicionado por `PHASE3_ENABLED=true` reclama el outbox y envía por Resend un
aviso a `AGENT_APPLICATION_EMAIL_TO`, configurable fuera del código. El correo
lleva URLs privadas firmadas con vencimiento de 10 minutos y no adjunta los
documentos. El envío permanece apagado: no se configuraron secretos ni se envió
correo real; el contrato pgTAP nuevo aún espera la ejecución de CI.

El candidato está verificado por lint, 11 pruebas focales, suite (179 archivos,
792 aprobadas y 1 omitida), build productivo base, build DEV con UI F3 y
Wrangler dry-run. La migración nueva **no** se validó en scratch: Docker rechazó
crear una red por agotamiento de los rangos de subred. No limpiar ni detener
contenedores ajenos para resolverlo. No se aplicaron migraciones a Supabase
persistente, DEV o producción, y no se desplegó ni fusionó el PR.

## Decisiones comunicadas por el dueño

- La postulación de agentes queda abierta; el dueño podrá seleccionar personas
  concretas y otras también podrán postularse.
- Máximo de cuatro agentes por provincia.
- Requisito mínimo: persona graduada de nivel superior. La experiencia en
  gestión de procesos/documentos se valora en el currículum, pero no es requisito
  obligatorio.
- La persona candidata enviará su currículum por correo.
- Cada agente aprobado tendrá un enlace único. Se atribuye el alta de la cuenta
  que se registra mediante ese enlace.
- Comisión de 20% de cada pago efectuado por una cuenta atribuida. El usuario
  confirmó que aplica a cada pago y renovación, y que se ajusta por reembolsos.
- Un mes gratis, una sola vez por cuenta, sin exigir método de pago para iniciar
  la prueba.
- Moneda: CUP.
- Para la primera salida, todas las funciones actuales siguen gratuitas: no hay
  cobros, paywall ni bloqueos automáticos. La matriz es provisional; no activar
  expiración de acceso hasta que el dueño apruebe la matriz final.
- Correo receptor provisional de postulaciones: `pochiprats18@gmail.com`.
- Se aceptan CV en PDF, JPG o PNG de hasta 10 MB. Se eliminan 30 días después
  de la decisión final, se guardan en bucket privado y no se adjuntan al correo.

| Tipo de cuenta | Trimestral | Anual |
|---|---:|---:|
| Persona natural | 200 CUP | 500 CUP |
| Persona jurídica | 10 000 CUP | 30 000 CUP |

## Hallazgos del repositorio

- Ya existen rol `agent`, verificación KYC, catálogo público de agentes y un
  panel básico reutilizable.
- No se encontró un módulo de planes, suscripciones o pagos de usuarios ni una
  integración de checkout.
- El libro actual `agent_commissions` es manual: exige un `lead_id` convertido,
  referencia de operación, tasa y moneda USD/CUP. No representa pagos de
  suscripción ni renovaciones. Conviene conservarlo como historial/prototipo y
  crear un ledger separado para comisiones originadas por pagos.
- Los RPC de referidos y comisiones están pausados/bloqueados mediante la
  aplicación y migraciones posteriores. La decisión del dueño actualiza la
  política comercial, pero no vuelve seguro restaurar directamente esas RPC:
  la atribución de visitas por UUID de cliente tiene riesgo de abuso y el
  cálculo nuevo requiere pagos verificados.
- El perfil de agente no contiene una asignación provincial normalizada ni un
  flujo para postularse; ambos se deben modelar antes de aplicar el límite de
  cuatro.
- El Worker ya tiene acceso a Resend para otras notificaciones, pero la dirección
  receptora de currículums sigue siendo provisional y debe configurarse de forma
  segura antes de enviar solicitudes reales.

## Propuesta de arquitectura

### 1. Postulación y selección de agentes

Crear un módulo separado de la identidad/KYC existente:

- `agent_applications`: datos mínimos de contacto, provincia principal,
  formación superior, resumen/experiencia y estado (`submitted`, `reviewing`,
  `waitlisted`, `approved`, `rejected`, `withdrawn`). Las solicitudes no
  aprobadas no ocupan cupo.
- Almacenar el CV en un bucket privado; aceptar PDF/JPG/PNG hasta 10 MB, validar
  en servidor, aplicar rate limit y CAPTCHA, y eliminarlo 30 días después de la
  decisión final. Nunca dejarlo en un bucket público ni adjuntarlo a logs. El
  correo provisional recibe un enlace firmado de corta duración, no el documento.
- AAL2 para leer/revisar solicitudes y aprobar/rechazar. Al aprobar, una RPC
  transaccional toma un lock por provincia, comprueba que queden menos de cuatro
  agentes activos y asigna el cupo. Un índice único no impone por sí solo un
  máximo de cuatro; el lock evita que aprobaciones simultáneas excedan el cupo.
- Mantener una lista de espera y permitir postularse aunque la provincia esté
  llena. Aprobación de la solicitud y activación como agente son pasos
  relacionados pero separados de KYC: solo se ofrece el panel de agente cuando
  el perfil correspondiente cumple las verificaciones vigentes.
- Usar provincia principal para contar el cupo. Si el dueño quiere que un agente
  cubra varias provincias, definir si consume un cupo en cada una.

### 2. Enlace y atribución al registro

- Mantener un código aleatorio único por agente, resuelto siempre en servidor.
- En el registro, enviar el código; nunca aceptar del navegador un `agent_id`.
  Una función confiable resuelve el código y guarda una atribución inmutable y
  única por cuenta recién creada. El mismo usuario no puede atribuirse después
  del alta ni cambiar de agente mediante parámetros de URL.
- No basar la comisión en visitas o consultas del enlace. El evento económico
  verificable es el pago atribuido; el contador de visitas puede seguir apagado
  hasta contar con reglas antifraude y retención.
- Rechazar autoatribución, códigos inactivos y nuevas atribuciones para cuentas
  preexistentes. Definir un proceso administrativo auditado para corregir un
  error legítimo, sin reescribir el historial.

### 3. Planes, prueba gratis y estado de acceso

Agregar un dominio de suscripciones separado de F4-BIZ:

- Catálogo versionado de planes por tipo de cuenta y período, con precio y
  moneda. Un cambio de precios crea una nueva versión y no modifica pagos
  históricos.
- `billing_accounts` representa al pagador; `subscriptions` conserva plan,
  estado, fechas del período, prueba y cancelación; `payment_transactions`
  conserva importes, moneda, estado y referencias idempotentes del proveedor.
- Crear la prueba de 30 días al activar una cuenta, sin método de pago. Bajo la
  matriz provisional, terminar la prueba no retira ninguna función: no hay cobro,
  paywall ni bloqueo automático. Activar degradación solo después de aprobar la
  matriz final. Evitar reiniciar la prueba para la misma cuenta.
- La interfaz debe enseñar precio CUP, duración, próxima fecha y estado. La
  autorización de funciones debe depender del estado almacenado por el servidor,
  no de la página de regreso del checkout.

### 4. Confirmación de pagos y proveedor

- El repositorio no contiene actualmente una pasarela de pagos.
- El proveedor debe admitir al comercio real, CUP, pagos de 3 y 12 meses,
  devoluciones consultables y notificaciones verificables. Un mensaje del
  navegador o una captura del comprador no confirma un pago. Si al inicio el
  pago es manual, exige una cola de conciliación AAL2 y referencia verificable.
- Implementar una interfaz de proveedor en el Worker y activar el plan solo
  después de verificar el webhook/firma y cotejar importe, moneda, cuenta y
  referencia. Dedupe por ID de evento/transacción; guardar eventos y permitir
  reintentos seguros.
- La selección del proveedor queda abierta. Stripe no debe proponerse para
  operaciones vinculadas a Cuba: su política oficial prohíbe esas relaciones.
  La documentación pública de CuboPago describe cobros en centavos y
  suscripciones mensuales, pero la revisión no confirmó admisión del comercio
  cubano, CUP ni ciclos trimestrales/anuales. No se debe inferir compatibilidad.

### 5. Comisión recurrente

- Crear un ledger nuevo vinculado a `payment_transaction_id`, `agent_id` y
  `referred_account_id`; poner una restricción única por pago elegible.
- Ante cada pago confirmado, registrar en una transacción el pago y el 20% de
  comisión. Conservar importes originales en CUP y el ID del proveedor; el
  cliente nunca calcula ni solicita la comisión.
- Reembolsos parciales generan un ajuste negativo proporcional; los totales no
  se borran ni se recalculan silenciosamente. Los webhooks duplicados no crean
  otra comisión.
- Panel AAL2 separado para revisar el ledger y registrar liquidaciones
  verificables; el agente solo lee su saldo/eventos. Pago de comisión al agente
  y cobro de suscripción son transferencias distintas.
- Propuesta provisional para la base: 20% del importe efectivamente cobrado,
  neto de reembolsos. El usuario no definió si se descuentan impuestos,
  descuentos promocionales o comisiones del procesador; conservar esas partidas
  por separado hasta que quede definida la regla.

## Orden de implementación recomendado

1. Resolver las decisiones abiertas de abajo y crear una especificación de
   suscripciones/pagos independiente de la especificación de oportunidades.
2. Implementar solicitudes de agentes, bucket privado, revisión AAL2, provincias
   y cupos transaccionales; probar la concurrencia localmente.
3. Implementar atribución de nuevas cuentas por enlace con inserción confiable,
   inmutable e idempotente. Mantener desactivado el conteo de visitas.
4. Implementar catálogo CUP, prueba y estados de acceso, inicialmente con
   proveedor simulado/local; no mostrar una suscripción como pagada sin evento
   confiable.
5. Seleccionar y validar proveedor con el comercio, país, CUP y los dos ciclos;
   después crear el adaptador Worker y verificar cobro/devolución en sandbox.
6. Crear ledger recurrente de comisiones y el proceso AAL2 de liquidación.
7. Integrar paneles, recorridos autenticados, E2E, migraciones por módulo y
   verificación de exclusión del bundle productivo.

## Decisiones aún necesarias antes de cobros reales

1. Funciones exactas de Cubitat que quedan disponibles gratis y cuáles requieren
   suscripción. Hasta definirlo, todas las funciones actuales siguen gratuitas
   y no se cobran ni se bloquean automáticamente.
2. Persona jurídica: si el precio es por empresa o por usuario, si varias
   personas pueden pertenecer a la misma cuenta y quién administra esa cuenta.
3. Proveedor/comercio que recibirá pagos en CUP, confirmación de ciclos
   trimestral/anual, devoluciones y notificaciones servidor-a-servidor. No se
   debe integrar un proveedor hasta confirmar la elegibilidad del comercio.
4. Comisión: confirmar la base respecto de impuestos, descuentos y tarifa del
   proveedor; plazo de retención ante reembolsos/contracargos, frecuencia y
   método de liquidación al agente, monto mínimo y qué sucede cuando el agente
   deja el programa.
5. Reclutamiento: confirmar que el correo provisional puede recibir solicitudes
   reales y definir qué comprobante valida el título. Ya quedaron fijados PDF,
   JPG y PNG hasta 10 MB, con eliminación 30 días después de la decisión final.
6. Cupos: catálogo oficial de provincias y si el límite cuenta agentes activos
   o aprobados, además de la regla para cobertura de varias provincias.

## Referencias técnicas consultadas

- Stripe, disponibilidad por país: <https://stripe.com/global>.
- Stripe, restricciones para operaciones vinculadas a Cuba:
  <https://stripe.com/mx/legal/restricted-businesses>.
- Stripe, requisitos de cuenta en otro país:
  <https://support.stripe.com/questions/requirements-to-open-a-stripe-account-in-another-country>.
- CuboPago, documentación de pago y suscripción:
  <https://developers.cubopago.com/endpoints/post-payment> y
  <https://developers.cubopago.com/endpoints/post-subscription>.

La matriz provisional no autoriza cobros ni bloqueos automáticos. Las reglas
descritas arriba deben tratarse como límites de la primera salida hasta resolver
los puntos pendientes y redactar los criterios finales.

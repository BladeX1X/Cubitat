# Fase 3 — políticas de agentes, suscripciones y comisiones

Fecha: 2026-11-03  
Estado: candidato de Fase 3 en preparación para `main`; no desplegado.
Entorno: producción inspeccionada en modo solo lectura; no se cambiaron datos ni esquema. La atribución de altas está solo en la rama candidata y su migración no está aplicada.

## Avance del candidato — 2026-11-03

La rama `feature/phase3-production-main` y el PR borrador #186 incorporan
intake autenticado DEV, carga privada CV/título, acceso administrativo de corta
duración a documentos y cola de moderación paginada bajo `AdminMfaGate`. Las
acciones AAL2 permiten revisar, esperar, rechazar y aprobar con evento inmutable.
La aprobación exige KYC y asigna una de cuatro plazas dentro de un lock
transaccional por provincia; cuando está llena, conserva la solicitud en espera.
Las decisiones finales programan eliminación a 30 días. La purga automática
está implementada en el candidato y el cupo hosted requiere reconciliar las
cuentas agent previas.

La migración candidata `20261103140000_agent_application_email_outbox.sql`
prepara un outbox privado, encolado en la transacción de intake. Un cron DEV
condicionado por `PHASE3_ENABLED=true` reclama el outbox y envía por Resend un
aviso a `AGENT_APPLICATION_EMAIL_TO`, configurable fuera del código. El correo
lleva URLs privadas firmadas con vencimiento de 10 minutos y no adjunta los
documentos. CI validó outbox e intake/revisión en base aislada; el envío permanece
apagado: no se configuraron secretos ni se envió correo real.

La migración `20261103150000_agent_application_province_capacity.sql` pasó el
job `database-security` en Supabase aislado; reserva una de cuatro plazas con
KYC y lock por provincia. La UI refleja aprobación o espera. La migración
`20261103160000_agent_application_evidence_retention.sql` y su worker cron están
en el commit siguiente, con pgTAP aún pendiente de CI; el worker borra a los 30
días, tiene tres intentos y retira los paths de la tabla.

La migración `20261103170000_agent_signup_referral_attribution.sql` añade atribución transaccional al registro por correo. Auth resuelve el código en el servidor, ignora roles enviados por el navegador y guarda una fila inmutable por cuenta. El dashboard permite al agente verificado generar su enlace bajo demanda. OAuth, visitas, contactos atribuidos y comisiones siguen desactivados. La migración de atribución de altas espera CI SQL aislado.

La versión actual pasó lint, la suite completa (181 archivos, 810 pruebas aprobadas y 1 omitida) y build estándar con guards. El build produjo sitemap estático de 2 URLs porque esta máquina no tenía configuración pública de Supabase; no cuenta como build final del release. Las pruebas focales del flujo de referido/panel pasaron 23/23. La migración nueva espera CI SQL aislado. No se aplicaron migraciones a Supabase persistente, DEV o producción, y no se desplegó ni fusionó el PR.

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

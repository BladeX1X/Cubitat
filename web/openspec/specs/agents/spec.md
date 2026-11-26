# Red de agentes y captación — Fase 3

> **Actualización de producto (2026-11-03):** el dueño definió postulación
> abierta con máximo cuatro agentes por provincia, graduación de nivel superior
> como requisito, experiencia como mérito, enlace por agente y comisión de 20%
> de cada pago del usuario atribuido, ajustada por reembolsos. También definió
> prueba de 30 días sin tarjeta y precios CUP por tipo de cuenta/período.
> Para la primera salida, las funciones actuales siguen gratuitas: no hay cobros,
> paywall ni bloqueos automáticos hasta aprobar la matriz final. El correo de CV
> `pochiprats18@gmail.com` es provisional; solo se envía un enlace firmado.
> Se aceptan PDF/JPG/PNG hasta 10 MB y se borran 30 días tras la decisión final.
> Los detalles y arquitectura se documentan en
> `docs/FASE3_AGENTES_SUSCRIPCIONES_PROPUESTA.md`. Esto resuelve la política
> comercial básica, pero no activa las RPC: pagos/suscripciones aún no existen,
> hay reglas de liquidación/retención y de cuenta jurídica por definir, y el
> proveedor CUP debe confirmarse antes de aceptar cobros.

## Estado de implementación — 2026-11-03

### Acceso desde Mi cuenta

Cuando la Fase 3 está habilitada, Mi cuenta ofrece una acción «Ser agente» que
abre la ruta autenticada `/postular-agente`. La acción se oculta para perfiles
con rol `agent`, que ya cuentan con acceso a su panel. No cambia el rol del
perfil ni el estado de KYC; la postulación sigue sujeta a revisión.

Mi cuenta consulta el estado más reciente de la postulación propia usando solo
la columna `status` permitida por RLS/grants. Mientras consulta, muestra un estado
de carga; si existe una postulación, presenta su estado actual en lugar de invitar
a duplicarla. Si la consulta falla, muestra un error y una acción de reintento,
sin presentar el CTA como si no existiera solicitud. Una solicitud aprobada puede
enlazar al panel de agente; CV, título, rutas privadas y motivos internos no se
exponen en esta tarjeta.

- El candidato incluye una ruta DEV apagada por defecto y un formulario solo
  visible en el perfil `phase2-dev` con bandera explícita para enviar CV y título,
  validación de firmas PDF/JPG/PNG y límite de 10 MiB, bucket privado, persistencia
  reservada a service role, RLS de estado propio/AAL2 y límite de solicitudes.
- El endpoint cuenta con pruebas Worker de autenticación/rate limit, validación,
  carga privada y limpieza al fallar la persistencia.
- `Mi cuenta` incluye un consentimiento explícito para que agentes publiquen su
  WhatsApp, limitado al perfil de Fase 3 y oculto para otros roles. Por defecto
  permanece desactivado; quitar el teléfono también retira el consentimiento.
  Su comportamiento tiene pruebas de activación/desactivación y de visibilidad
  por rol. El Worker solo admite `true`/`false` para ese campo en PATCH autenticado
  y continúa rechazando columnas protegidas. La API pública sigue omitiendo el
  número cuando el consentimiento no está activo. El perfil dedicado
  `phase2-agent-consent-production` habilita solo este control dentro del build
  productivo de Fase 2 y excluye las demás pantallas/endpoints de Fase 3. La
  primera verificación de build del perfil está pendiente; el despliegue real
  debe verificarse con una sesión de agente.
- La migración y test pgTAP pasaron en un scratch temporal (6/6); no se aplicaron
  a DEV ni producción. La interfaz protegida permite consultar la cola paginada
  y abrir enlaces privados de dos minutos con comprobación AAL2 en Worker; aún
  no toma decisiones. Faltan notificación, revisión/decisión AAL2, asignación de cupo
  provincial transaccional y purga tras 30 días. La rama candidata agrega una
  RPC con acciones AAL2 auditadas para iniciar revisión, lista de espera y
  rechazo con motivo; la aprobación permanece bloqueada hasta que exista una
  asignación de cupo provincial transaccional. El rechazo programa eliminación
  a los 30 días, pero el proceso automático de purga aún no está desplegado.
  El requisito de postulación permanece parcialmente implementado y no debe
  considerarse cerrado.

Hasta implementar los contratos descritos en esta especificación, el panel
MUST NOT aprovisionar códigos ni consultar repositorios de referidos, contactos
atribuidos o comisiones. Las oportunidades consentidas siguen disponibles de
forma independiente. El Worker MUST descartar atribución de referido por
defecto y solo aceptarla cuando el entorno la habilite explícitamente; la
configuración productiva permanece desactivada.
Mientras continúe la pausa técnica, PostgreSQL MUST revocar `EXECUTE` de `anon`,
`authenticated` y `service_role` en las RPC de creación de enlaces, atribución
de visitas y mutación de comisiones; ocultar la UI o la allowlist del Worker no
es suficiente porque el cliente podría llamar directamente al Data API.
Cuando se implemente la atribución de altas, `ensure_agent_referral_link()` MUST preservar enlaces
existentes con `active=false`; una llamada de recuperación nunca debe
reactivarlos. Al entrar en conflicto con un enlace ya existente, la RPC MUST
volver a leer su estado y nunca convertir la consulta idempotente en una orden
de activación.

## Propósito

Completar el programa de agentes existente con captación de propiedades y
clientes, seguimiento, atribución de contactos y comisiones auditables.

## Alcance heredado y fronteras

- La activación de rol `agent`, verificación KYC, perfil público, distintivo,
  catálogo de propiedades y métricas de contacto ya existen y se reutilizan.
- Un agente elegible tiene rol canónico `agent` o `admin` y
  `verification_status = verified`; los administradores participan también
  como agentes sin perder sus controles administrativos AAL2.
- La app no asume tasas universales, acuerdos legales, pagos bancarios ni
  custodia de dinero. El cierre digital/escrow permanece fuera del alcance.
- El perfil público de agente MUST omitir documentos e identificadores de KYC,
  incluido el número de licencia. El distintivo de verificación comunica el
  estado sin divulgar la evidencia usada para decidirlo. MUST omitir conteos de
  denuncias, moderación y otras métricas internas.
- El teléfono solo se devuelve para agentes verificados con publicaciones
  activas cuando el agente habilitó explícitamente `public_whatsapp_enabled`.
  El valor predeterminado MUST ser `false`; retirar el consentimiento MUST
  ocultar el número del perfil público.
- Los datos de prospectos son privados y solo se recogen con autorización del
  prospecto para contacto.

## Límites de módulo y contratos

- Identidad/elegibilidad reutiliza el perfil profesional y KYC existentes; no
  crea cuentas de agente paralelas.
- Referidos mantiene código/enlace y atribución. La captura solo consulta el
  código activo mediante el Worker/RPC confiable.
- El contrato de código del agente vive en
  `src/modules/agents/referrals/agentReferralRepository.ts`; el tracker
  `src/modules/referrals/utils/tracker.ts` solo gestiona atribución de sesión y
  no aprovisiona códigos ni consulta oportunidades.
- Los repositorios de oportunidades y sus eventos viven en
  `src/modules/agents/leads/`; comisiones y sus eventos viven en
  `src/modules/agents/commissions/`. Los compositores F/G no consultan tablas.
- Oportunidades es dueño de `agent_leads` y `agent_lead_events`; comisiones es
  dueño de `agent_commissions` y `agent_commission_events`.
- Comisiones recibe `lead_id` y verifica conversión en servidor; el módulo de
  oportunidades no importa ni invoca el módulo de comisiones.
- Los dashboards de agente y administración componen lecturas/acciones de los
  módulos y no escriben directamente en tablas privadas.
- Cada módulo valida identidad/rol/RLS en el servidor; una pantalla oculta o un
  feature flag no sustituye autorización.
- El código actual comparte una migración y un flag por fase. La separación
  define ownership funcional; habilitación independiente por release requiere
  migraciones y flags separados y queda fuera del alcance presente.

## Requisitos

### Requisito: Postulación abierta y selección de agentes

- GIVEN una persona interesada en ser agente
- WHEN envía una postulación, ya sea por convocatoria o iniciativa propia
- THEN MUST poder indicar provincia principal, formación y experiencia
- AND MUST adjuntar su currículum a una ruta privada
- AND graduación de nivel superior MUST ser requisito mínimo
- AND experiencia en gestión de procesos/documentos MAY sumar mérito, pero MUST
  NOT ser requisito excluyente
- AND la decisión de selección MUST ser manual y quedar auditada por admin AAL2
- AND MUST permitirse recibir solicitudes aunque una provincia no tenga cupos,
  conservándolas en lista de espera
- AND el sistema MUST impedir de forma transaccional más de cuatro agentes
  activos asignados a la misma provincia principal
- AND una notificación por correo MUST enlazar el CV mediante URL privada de
  corta duración; el CV MUST NOT quedar público ni aparecer en logs
- AND MUST aceptar únicamente PDF, JPG o PNG de hasta 10 MB
- AND MUST eliminar el archivo 30 días después de la decisión final
- AND el correo receptor provisional MUST configurarse fuera del código y
  MUST NOT recibir el CV como adjunto

### Requisito: Retiro administrativo del acceso de agente

- GIVEN un perfil con rol `agent`, con o sin asignación provincial activa
- WHEN un moderador con sesión AAL2 confirma el retiro con un motivo de 3 a 500 caracteres
- THEN el servidor MUST registrar un evento de auditoría inmutable y liberar la plaza provincial en la misma transacción
- AND MUST cambiar únicamente el rol del perfil a `buyer`
- AND MUST conservar la cuenta, publicaciones e historial del usuario
- AND MUST NOT permitir retirar el rol `admin` ni actuar sin AAL2
- AND la lista de agentes activos MUST devolver solo nombre, provincia (o indicar que no tiene plaza) e identificador para moderación

#### Scenario: Validar y retener un currículum
- GIVEN una postulación nueva
- WHEN se carga su CV
- THEN el servidor MUST validar tipo real y tamaño máximo de 10 MB
- AND MUST guardar el archivo en un bucket privado
- AND MUST borrarlo 30 días después de aprobar o rechazar la solicitud
- AND la notificación MUST usar una URL firmada de corta duración

### Requisito: Planes de suscripción y prueba

- GIVEN una cuenta nueva, natural o jurídica
- WHEN inicia su acceso de suscripción
- THEN MUST recibir 30 días de prueba gratis una sola vez por cuenta, sin
  requerir un método de pago para iniciar
- AND MUST ofrecer los precios confirmados en CUP:
  natural 200 trimestral y 500 anual; jurídica 10 000 trimestral y 30 000 anual
- AND el precio, período, tipo de cuenta y fecha de vigencia MUST persistir como
  catálogo versionado
- AND el navegador MUST NOT conceder acceso premium basándose solo en el
  retorno visual del proveedor; la confirmación proviene del servidor
- AND mientras la matriz gratis/de pago sea provisional, vencer el período de
  prueba MUST NOT cobrar ni bloquear funciones automáticamente

### Requisito: Atribución de nuevos registros

- GIVEN una persona nueva que abre el registro desde el código de un agente
- WHEN su cuenta se crea
- THEN el servidor MUST resolver el código y asignar como máximo un agente a
  esa cuenta dentro de la transacción/idempotencia del alta
- AND MUST NOT aceptar un `agent_id` enviado por el navegador
- AND MUST rechazar autorreferidos y atribución tardía a cuentas preexistentes
- AND la atribución MUST ser inmutable salvo corrección administrativa
  auditada
- AND visitas o clics del cliente MUST NOT bastar para generar comisión

### Requisito: Comisión por pagos de cuentas atribuidas

- GIVEN una suscripción vinculada a una cuenta atribuida a un agente
- WHEN un pago de renovación o plan se confirma en servidor
- THEN MUST registrarse una comisión CUP de 20% por ese pago confirmado
- AND MUST ajustarse el importe por reembolsos, sin borrar el evento original
- AND cada evento de pago MUST producir como máximo un asiento de comisión
- AND el agente MUST leer únicamente sus propios asientos
- AND aprobación y liquidación MUST quedar auditadas detrás de AAL2
- AND pagos/reembolsos MUST verificarse mediante el proveedor o conciliación
  administrativa auditada, nunca por un resultado enviado por el navegador

### Requisito: Consentimiento para contacto público del agente

- GIVEN un agente abre la sección de contacto de Mi cuenta
- WHEN activa o desactiva la opción de mostrar WhatsApp en su perfil público
- THEN la aplicación MUST guardar la preferencia en su propio perfil
- AND la RPC pública MUST devolver el teléfono solo si la preferencia está activa
- AND el perfil público MUST indicar claramente cuando el agente no comparte WhatsApp
- AND un perfil nuevo o migrado MUST mantener la preferencia desactivada
- AND el Worker MUST aceptar esa única propiedad de consentimiento en un PATCH autenticado de `profiles`
- AND MUST NOT permitir que este mecanismo cambie rol, estado KYC u otros campos protegidos

### Requisito: Acceso al programa de agentes

- GIVEN un usuario autenticado con KYC aprobado
- WHEN activa el perfil profesional existente
- THEN MUST conservarse el rol canónico en `profiles`
- AND el panel MUST quedar disponible para agentes y administradores verificados
- AND un administrador sin KYC verificado MUST permanecer bloqueado como agente
- AND la interfaz MUST explicar el requisito de KYC cuando no se cumple
- AND la interfaz MUST ofrecer navegación a Mi cuenta para revisar el estado de KYC
- AND el panel MUST comprobar rol y KYC antes de consultar propiedades, métricas u oportunidades privadas del dashboard

### Requisito: Privacidad de métricas de contacto del agente

- GIVEN un agente verificado consulta métricas desde su panel
- WHEN el cliente carga contactos por teléfono o WhatsApp
- THEN MUST obtener esos contadores mediante `get_own_property_contact_metrics()`
- AND la RPC MUST limitar cada fila a `auth.uid()` y exigir rol `agent` o `admin` con KYC `verified`
- AND anon, `service_role` y `authenticated` MUST NOT leer las columnas de contadores directamente
- AND un fallo de esta RPC MUST dejar visibles las propiedades y mostrar las métricas de contacto como no disponibles, sin presentarlas como cero

### Requisito: Captación de propiedad

- GIVEN un agente verificado en su panel
- WHEN registra un inmueble que todavía no es una publicación de Cubitat
- THEN MUST pedir título breve, ubicación pública y contacto autorizado del
  interesado
- AND MUST mantener contacto y notas en tablas privadas con RLS
- AND MUST evitar tratar el prospecto como una propiedad pública/moderada
- AND MAY asociar una publicación real después de su creación/moderación

### Requisito: Límite contra abuso al crear oportunidades

- GIVEN un agente verificado que llama `create_agent_lead()` directamente o
  mediante el Worker
- WHEN intenta crear más de 20 oportunidades dentro de una ventana móvil de 24
  horas
- THEN la base de datos MUST rechazar la creación adicional con un error de
  límite identificable
- AND el panel MUST explicar que se alcanzó el límite y cuándo podrá intentarse
  nuevamente, sin exponer detalles internos de PostgreSQL
- AND MUST serializar las creaciones concurrentes del mismo agente antes de
  contar y escribir
- AND MUST conservar autorización, consentimiento y evento inicial dentro de
  la misma RPC transaccional
- AND MUST aplicar el límite en base de datos para que no pueda omitirse al
  evitar el Worker
- AND MUST cap raw text bytes before trimming or regex validation, including
  phone input, so direct Data API calls cannot force unbounded text processing
- AND MUST NOT modificar Supabase DEV o producción sin una operación explícita
  autorizada

### Requisito: Cliente referido

- GIVEN un agente verificado
- WHEN registra un cliente que dio permiso para recibir seguimiento
- THEN MUST guardar nombre, teléfono, interés y consentimiento confirmado
- AND MUST permitir al agente seguir el estado de atención
- AND MUST impedir que otros agentes o visitantes consulten esos datos

### Requisito: Estado persistente de enlaces de referido

- GIVEN un enlace de referido desactivado administrativamente
- WHEN una sesión autenticada intenta recuperar/provisionar el enlace
- THEN la RPC MUST rechazar la operación y conservar `active=false`
- AND una colisión de unicidad MUST NOT cambiar `active` ni `updated_at`
- AND un enlace activo existente MUST devolver el mismo código
- AND un agente elegible sin enlace MUST recibir un código único activo e idempotente

### Requisito: Seguimiento trazable

- GIVEN una oportunidad de captación existente
- WHEN su estado cambia
- THEN MUST conservar evento inmutable con actor, estado anterior/nuevo,
  motivo y timestamp
- AND el servidor MUST validar transición y rol antes de guardar
- AND un agente MUST NOT reabrir una oportunidad con estado `lost`
- AND solo una sesión administrativa AAL2 MAY reabrirla como `contacted`, con
  un motivo registrado en el evento

### Requisito: Moderar el acceso de agentes

- GIVEN un moderador autenticado
- WHEN consulta o retira el acceso de un agente desde DEV
- THEN el Worker MUST permitir explícitamente solo las RPC administrativas
  necesarias y conservar el JWT de la sesión
- AND PostgreSQL MUST exigir admin AAL2 para listar agentes y retirar acceso
- AND usuarios anónimos MUST NOT poder invocar estas RPC mediante el Worker

### Requisito: Cálculo manual legado (no satisface la política nueva)

- GIVEN una oportunidad convertida y una decisión de comisión registrada por
  administración en AAL2
- WHEN se especifican monto elegible, tasa y moneda
- THEN MUST calcularse `round(monto_elegible * tasa / 100, 2)` en base de datos
- AND este contrato manual ligado a `lead_id` MUST NOT usarse para calcular
  comisiones de suscripción; el ledger nuevo se vincula a pagos confirmados
- AND MUST conservar base, tasa, importe calculado, moneda, agente, creador y
  estado de aprobación/pago
- AND el agente MUST tener lectura únicamente de sus comisiones
- AND un admin MUST anular un cálculo con motivo en vez de borrar/reescribir
  silenciosamente el historial

### Requisito: Dashboard de agente

- GIVEN un agente verificado
- WHEN abre `/panel-agente`
- THEN MUST ver el registro y seguimiento de oportunidades
- AND MUST ocultar el enlace de referido, métricas de atribución y comisiones
  hasta que la atribución de registros y los pagos vinculados estén
  implementados y revisados
- AND MUST poder filtrar por tipo/estado
- AND MUST conservar las métricas actuales de propiedades, vistas y contactos
- AND MUST presentar carga, vacío, error y reintento
- AND un fallo de lectura de un dominio MUST NOT ocultar los datos disponibles de los demás dominios
- AND MUST identificar el estado de oportunidades sin presentar datos no cargados como una lista vacía
- AND MUST mostrar el formulario y el listado dentro de secciones colapsables cerradas inicialmente
- AND los controles del encabezado MUST permanecer dentro del panel entre 1024 y 1279 píxeles, apilándose antes de usar el diseño en dos columnas

### Requisito: Panel administrativo de agentes y liquidaciones

- GIVEN una sesión admin elevada a AAL2
- WHEN abre operaciones de agentes
- THEN MUST consultar la cola de prospectos
- AND MUST permitir revisar postulaciones, cupos provinciales y solicitudes
  consentidas
- AND MUST mantener ocultas las mutaciones y liquidaciones de comisión hasta
  que exista ledger respaldado por pagos verificados
- AND las RPC de mutación de comisiones MUST NOT estar en la allowlist del
  Worker DEV durante la pausa
- AND cambios de selección, asignación de cupo, corrección de atribución y
  liquidación MUST conservar una bitácora inmutable
- AND todas las mutaciones MUST ejecutarse mediante RPC con autorización
  efectiva del servidor y auditoría transaccional

### Requisito: Diagnóstico de postulaciones y documentos privados

- GIVEN una solicitud administrativa de documentos o una decisión de postulación
- WHEN el Worker, Storage, PostgREST o la RPC rechazan o no pueden completar la operación
- THEN MUST distinguir denegación AAL2, límite temporal, solicitud ausente,
  consulta de datos, firma de Storage y precondiciones de KYC/estado
- AND MUST NOT devolver rutas, tokens, URLs firmadas ni mensajes brutos de infraestructura
- AND MUST limitar los logs a etapa, estado HTTP y causa enumerada, sin ID de postulación
- AND MUST normalizar respuestas de RPC anidadas en la propiedad `error` con
  profundidad acotada antes de clasificar autorización, KYC/estado, duplicado,
  caché del esquema o fallos de transporte
- AND MUST NOT presentar mensajes brutos ni valores internos de esas respuestas

### Requisito: Confidencialidad del motivo de rechazo

- GIVEN una postulación rechazada con nota interna
- WHEN un moderador autorizado consulta el historial de rechazos
- THEN MUST poder leer la nota desde una vista administrativa paginada protegida por AAL2 y RLS
- AND el motivo MUST permanecer oculto para el solicitante en Mi cuenta y en cualquier respuesta pública
- AND MUST NOT copiar la nota a notificaciones, logs ni datos públicos

#### Escenario: Solicitante y moderación ven información distinta

- GIVEN una postulación rechazada con motivo registrado
- WHEN la cuenta solicitante consulta Mi cuenta
- THEN MUST ver el estado de la postulación sin el motivo interno
- WHEN un moderador con AAL2 abre el historial privado
- THEN MUST poder ver el motivo junto con la fecha y el contexto mínimo de la solicitud

#### Observación de producción — envío de postulación (2026-11-05)

La interfaz mostró un fallo genérico al enviar una postulación; la captura no
incluye el estado HTTP y por sí sola no identifica si falló Storage o PostgREST.
La corrección candidata conserva HTTP 409 de PostgREST para que la interfaz
explique una solicitud abierta existente y registra únicamente la etapa y el
estado HTTP de fallos de carga/persistencia. El estado de red se registra como
`network_unavailable`. El Worker devuelve códigos públicos enumerados distintos
para fallo de Storage y fallo de persistencia, y la interfaz ofrece mensajes
específicos sin mostrar el detalle bruto del proveedor. No se registran datos del
formulario, nombres/rutas de archivo, contenido documental ni ID de solicitud.
La cobertura automatizada local verifica ambos mensajes y el saneamiento, pero
esto no demuestra que el fallo productivo original esté resuelto hasta promover
la corrección y verificar un envío sintético autorizado.

#### Formato de URLs firmadas de Supabase Storage

El REST de Storage devuelve `signedURL` relativa a su raíz como
`/object/sign/<bucket>/<ruta>?token=...`. Los consumidores de Cubitat validaban
únicamente `/storage/v1/object/sign/...`, por lo que descartaban firmas válidas
al abrir documentos desde Moderación y al construir enlaces para correo. El
Worker normaliza la forma documentada a una URL absoluta del mismo proyecto y
mantiene validaciones de origen, bucket y token. Esto queda cubierto en pruebas
locales; el acceso real en DEV aún requiere reintentar la apertura de documentos
con una sesión administrativa AAL2. No se registra ni se expone la URL firmada.

### Requisito: Entorno local

- GIVEN una compilación que no sea `development` con Supabase local
- WHEN se carga la aplicación
- THEN rutas y paneles exclusivos de Fase 3 MUST estar deshabilitados
- AND ningún cambio de este alcance MUST aplicarse automáticamente a Supabase
  DEV o producción


## Implementación candidata — capacidad provincial (2026-11-03)

La migración `20261103150000_agent_application_province_capacity.sql` agrega
asignaciones privadas e historial. `review_agent_application(..., 'approved')`
requiere AAL2 y KYC verificado, obtiene lock transaccional por provincia y asigna
una de cuatro plazas; si la capacidad está completa devuelve `waitlisted`. La
UI administrativa muestra ambos resultados. Cambiar el perfil al rol agent sin
asignación está bloqueado y dejar de ser agente verificado libera la plaza.

El contrato pgTAP debe pasar en CI aislado antes de considerar la migración
verificada. Este control cuenta asignaciones explícitas; antes de usarlo en DEV,
reconciliar cada cuenta agent previa con su provincia principal. No desplegar
hasta verificar esa reconciliación y la purga automática de documentos.

## Implementación candidata — retención de evidencia (2026-11-03)

La migración `20261103160000_agent_application_evidence_retention.sql` revoca
la lectura directa de `cv_path`/`diploma_path` a usuarios autenticados y crea
RPC de claim/complete/retry solo para `service_role`. El cron DEV, condicionado
por `PHASE3_ENABLED=true`, borra el CV y título 30 días después de una decisión
final, con tres intentos y limpieza de rutas cuando termina. Sus contratos pgTAP
quedan agregados a CI; no habilitar hasta que pasen y reconciliar las cuentas
agent legacy en DEV.

## Proxy autenticado de revisión en DEV (2026-11-04)

El Worker DEV permite reenviar `review_agent_application` únicamente con una
sesión autenticada. El proxy no sustituye la autorización de PostgreSQL: la RPC
continúa exigiendo AAL2 y validando las transiciones y precondiciones definidas
por la migración. Las solicitudes anónimas siguen bloqueadas en el borde.

### Contrato del proxy de revisión en producción — 2026-11-25

El Worker productivo incluye `review_agent_application` en su lista explícita
de RPC autenticadas permitidas, junto con las operaciones administrativas de
agentes. Sin esta entrada, el proxy devuelve `Operación no permitida.` antes de
que PostgREST ejecute la decisión. La prueba `worker-phase2-production.test.ts`
verifica que la lista de producción conserve esta RPC. PostgreSQL sigue siendo
responsable de autorizar y validar cada transición.

## Perfil productivo preparado (2026-11-03)

La rama candidata añade el perfil `phase3-production`, que requiere la URL y
clave pública de Supabase de producción, incluye las vistas F3 y pasa los
verificadores de bundle F2/F3. El Worker productivo contiene rutas autenticadas
para postulaciones y enlaces privados de documentos, limitadas por usuario, y
trabajos programados de correo/purga. `PHASE3_ENABLED` permanece explícitamente
en `false` en `wrangler.jsonc`, por lo que esas operaciones responden 404 y los
trabajos F3 no se ejecutan.

Esto prepara código y CI; no acredita el esquema hosted. Las seis migraciones
F3 candidatas y sus objetos/bucket continúan pendientes de reconciliación en
DEV conforme al handoff, y la base de producción no se modificó. No habilitar
la bandera ni desplegar el perfil hasta confirmar el esquema, permisos, bucket,
secretos y una prueba de extremo a extremo en un entorno persistente autorizado.

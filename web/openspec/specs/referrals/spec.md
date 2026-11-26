# Proceso de Referidos y Crecimiento — Fase 3

> **Decisión del dueño (2026-11-03):** se aprobó atribuir nuevas cuentas a un
> agente cuando se crean mediante un código activo. La atribución de cuenta se
> implementa por separado; visitas, contactos atribuidos y comisiones siguen
> pausados mientras se cierran sus controles y reglas económicas.

## Capacidades activas y pausadas

La decisión del dueño autoriza la atribución de altas nuevas. Los efectos
secundarios que no forman parte de esa decisión permanecen suspendidos:

- El dashboard MUST NOT consultar visitas, contactos atribuidos ni comisiones.
- La aplicación MUST quitar `ref` de la URL conservando los demás parámetros y
  hash. Puede conservar temporalmente un código validado en `sessionStorage`
  para registro por correo o retorno Google en la misma pestaña; MUST NOT
  enviarlo en formularios de contacto.
- La atribución de altas por correo MUST resolverse dentro del trigger de Auth.
  Para Google, el callback autenticado MUST invocar la RPC de atribución, que
  valida en servidor la antigüedad de la cuenta, el proveedor Google, el estado
  activo del enlace y la elegibilidad KYC/rol del agente. Metadata editable del
  navegador nunca identifica directamente al agente.
- El Worker DEV MUST ignorar `referral_code` en solicitudes de contacto cuando
  `AGENT_REFERRALS_ENABLED=false`.
- Un enlace existente marcado `active=false` MUST permanecer pausado; una
  operación de creación/recuperación MUST NOT reactivarlo como efecto lateral.
- Las visitas y comisiones MUST NOT activarse por crear una atribución de alta.
- No se borran códigos, contactos atribuidos, visitas, tablas ni migraciones ya
  existentes ni se atribuyen cuentas existentes retroactivamente.

## Purpose
Define los enlaces atribuibles de agentes, la conversión de contactos y el
registro auditable de oportunidades y comisiones. La Fase 3 se limita a captación
y trazabilidad; no procesa pagos ni custodia fondos.

## Requirements

### Requirement: Generación de códigos únicos
El sistema MUST asignar un identificador de referido único a cada usuario verificado o agente inmobiliario registrado.

#### Scenario: Agente verificado obtiene su enlace
- GIVEN un usuario autenticado con rol `agent` y KYC `verified`
- WHEN abre su panel privado
- THEN el sistema MUST generar o recuperar un código único `AG-XXXXXXXX`
- AND MUST permitir copiar un enlace directo para compartir
- AND MUST rechazar la operación para otros roles o agentes sin KYC vigente

#### Scenario: Un enlace pausado no se reactiva al recuperar el código
- GIVEN un enlace propio del agente marcado `active=false`
- WHEN la RPC de provisión/recuperación se invoca durante la pausa del programa
- THEN MUST rechazar la solicitud y mantener el enlace inactivo
- AND MUST NOT cambiar `active` a `true` mediante `ON CONFLICT`

---

### Requirement: Atribución inmutable al crear una cuenta

- GIVEN una cuenta nueva creada desde el enlace de un agente
- WHEN Supabase Auth inserta la cuenta
- THEN el servidor MUST resolver el código activo a un agente elegible `agent`
  o `admin` con KYC `verified`
- AND MUST guardar como máximo una atribución inmutable para esa cuenta
- AND MUST ignorar códigos inexistentes, pausados o de perfiles no verificados
- AND MUST asignar siempre el rol `buyer` desde el trigger, ignorando cualquier
  rol enviado en `user_metadata`
- AND MUST NOT aceptar un `agent_id` del navegador
- AND anónimos y usuarios autenticados MUST NOT leer ni mutar filas de atribución
- AND el código MUST NOT asociarse a contactos ni generar una comisión

#### Scenario: Registro por correo desde un enlace activo
- GIVEN una persona nueva que llegó con `?ref=AG-XXXXXXXX`
- WHEN confirma el formulario de registro por correo
- THEN la app MUST conservar el código solo hasta enviar el registro
- AND el trigger MUST crear la atribución y guardar el rol de perfil como `buyer`
- AND la app MUST limpiar el código local después de que Auth acepte la solicitud

#### Scenario: Código inválido o no elegible
- GIVEN un código inválido, pausado o de un perfil sin KYC verificado
- WHEN se crea una cuenta
- THEN la cuenta MUST crearse sin atribución y sin bloquear el registro

#### Scenario: Registro nuevo con Google desde un enlace de agente
- GIVEN una persona nueva que abrió un enlace `?ref=AG-XXXXXXXX` en el mismo
  navegador y mantiene el código validado en `sessionStorage`
- WHEN Google crea la cuenta y la persona vuelve a `/auth/callback`
- THEN el callback MUST enviar el código guardado a una RPC autenticada
- AND la RPC MUST atribuir solo cuentas Google con `created_at` dentro de los
  últimos 15 minutos y perfil `buyer`
- AND la RPC MUST resolver el código a un enlace activo de un perfil elegible
  `agent`/`admin` con KYC verificado y MUST rechazar la autoatribución
- AND una cuenta ya existente, un enlace pausado o una RPC fallida MUST NOT
  bloquear el inicio de sesión ni crear una atribución
- AND la aplicación MUST limpiar el código cuando la RPC responda sin error y
  conservarlo si la RPC falla para permitir reintentar dentro de la ventana

#### Scenario: Inicio de sesión con Google de una cuenta existente
- GIVEN una cuenta Google creada hace más de 15 minutos
- WHEN la persona inicia sesión desde una pestaña que tiene un código referido
- THEN la RPC MUST rechazar la atribución y MUST NOT modificar el registro previo

---

### Requirement: Atribución de visitas (Tracking) — pausada
Esta capacidad permanece desactivada hasta aprobar consentimiento, límites de frecuencia, retención y controles de abuso. La implementación de atribución de altas no la reactiva.

#### Scenario: Visitante entra mediante un enlace de referido
- GIVEN una URL con el parámetro `ref=AG-XXXXXXXX`
- WHEN la aplicación se carga en el navegador del visitante
- THEN el sistema MUST extraer el parámetro `ref` de la URL
- AND MUST validar y almacenar el código en `sessionStorage` durante la sesión
- AND MUST registrar una visita única por código y sesión de navegador sin almacenar datos personales
- AND MUST retirar solo el parámetro `ref` preservando ruta, otros parámetros y hash
- AND MUST mantener el código durante la navegación a la ficha/contacto

#### Scenario: Agente consulta el alcance de su enlace
- GIVEN un agente verificado con enlace activo
- WHEN abre su panel
- THEN MUST ver visitas únicas al enlace separadas de los contactos enviados
- AND MUST impedir que un usuario consulte el conteo de otro agente

---

### Requirement: Conversión de leads atribuidos — pausada
Esta capacidad permanece desactivada mientras los RPC de contactos atribuidos y las reglas de comisiones sigan suspendidos. La implementación de atribución de altas no la reactiva.

#### Scenario: Visitante atribuido envía un formulario de contacto
- GIVEN un visitante con un código activo de agente (`AG-XXXXXXXX`) en su sesión
- WHEN rellena y envía el formulario de contacto para cualquier propiedad
- THEN el sistema MUST persistir el lead en la tabla de contactos
- AND MUST resolver el código en el servidor y registrar el código/agente en
  `referral_id` y la procedencia `agent_referral`
- AND MUST ignorar el código si es inválido, está inactivo o corresponde al
  usuario autenticado que envía el contacto
- AND MUST retirar el código de la sesión después de un contacto guardado
- AND MUST NOT confiar en un `agent_id` proporcionado por el navegador

#### Scenario: Visitante sin atribución envía contacto
- GIVEN un visitante sin código de referido en su sesión
- WHEN envía el formulario de contacto
- THEN el sistema MUST guardar el contacto con la columna de referido como nula o marcar la procedencia como orgánica (`direct` / `organic`)

---

### Requirement: Registro de oportunidades del agente — fuera del alcance de esta migración

#### Scenario: Agente registra una propiedad captada o un cliente referido
- GIVEN un agente autenticado con KYC vigente
- WHEN registra un prospecto y confirma que la persona autorizó el contacto
- THEN el sistema MUST guardar los datos mínimos bajo el propietario agente
- AND MUST restringir la lectura al agente responsable y administración
- AND MUST registrar los cambios de estado en una bitácora append-only

### Requirement: Libro de comisiones — fuera del alcance de esta migración

#### Scenario: Administración registra una comisión
- GIVEN una oportunidad convertida y un administrador en AAL2
- WHEN registra el monto elegible, tasa y moneda
- THEN el sistema MUST calcular la comisión en servidor con redondeo a dos decimales
- AND MUST conservar actor, fecha, base de cálculo, tasa y estado
- AND MUST impedir que el agente cree o cambie sus valores financieros
- AND MUST distinguir un cálculo aprobado de una transferencia de pago

### Requirement: Prevención de fraude
El sistema SHOULD evitar la auto-atribución o registros duplicados maliciosos.

#### Scenario: Usuario intenta auto-referirse
- GIVEN un usuario autenticado con su propio código de agente
- WHEN intenta acceder a la web utilizando su propio enlace de referido
- THEN el sistema MUST ignorar la atribución para evitar auto-referidos en conversiones de su propia cuenta

### Requirement: Controles de rol y acceso

#### Scenario: Agente consulta su dashboard
- GIVEN un agente autenticado y verificado
- WHEN consulta sus oportunidades o comisiones
- THEN el sistema MUST limitar las filas al agente autenticado mediante RLS
- AND MUST incluir estados de carga, error, vacío y reintento en la interfaz

#### Scenario: Otro agente intenta consultar datos privados
- GIVEN un agente autenticado distinto del propietario de las oportunidades
- WHEN consulta, actualiza o enumera datos de otro agente
- THEN el sistema MUST denegar la lectura/escritura mediante RLS/RPC

#### Scenario: Admin gestiona oportunidades o comisiones
- GIVEN un administrador con segundo factor AAL2
- WHEN carga la sección administrativa o cambia un estado financiero
- THEN el servidor MUST validar admin y AAL2
- AND MUST dejar la decisión en la bitácora transaccional

### Requirement: Despliegue aislado durante desarrollo

#### Scenario: Build productivo normal
- GIVEN un build sin el perfil local de Fase 3
- WHEN se compila la aplicación
- THEN las pantallas y rutas de captación/comisiones MUST permanecer fuera del build público
- AND las migraciones MUST quedar versionadas sin aplicarse a servicios remotos durante este trabajo

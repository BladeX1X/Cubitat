# Proceso de Referidos y Crecimiento — Fase 3

> **Estado de producto (2026-10-16):** la política de enlaces, visitas y
> atribución está pendiente de acordarse con el dueño. El código disponible en
> DEV es un prototipo y no implica aprobación de sus reglas. Revisar los
> requisitos y escenarios de esta especificación antes de continuar el módulo.

## Restricción temporal de DEV

Hasta documentar la decisión comercial, referidos queda suspendido también en
los efectos secundarios, no solo en la interfaz:

- El dashboard MUST NOT crear/recuperar códigos, consultar visitas, ni leer
  contactos atribuidos o comisiones.
- La aplicación MUST quitar `ref` de la URL, conservar los demás parámetros y
  hash, borrar cualquier código legado de `sessionStorage` y no atribuir nuevos
  contactos desde el navegador.
- El Worker DEV MUST ignorar `referral_code` en solicitudes de contacto cuando
  `AGENT_REFERRALS_ENABLED=false`.
- Un enlace existente marcado `active=false` MUST permanecer pausado; una
  operación de creación/recuperación MUST NOT reactivarlo como efecto lateral.
- No se borran códigos, contactos atribuidos, visitas, tablas ni migraciones ya
  existentes. La producción conserva su configuración actual.

Estos límites temporales prevalecen sobre los escenarios de activación que
siguen, hasta que el dueño apruebe y se documente una política.

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

### Requirement: Atribución de visitas (Tracking)
El sistema MUST detectar y persistir la procedencia de una visita cuando se utiliza un enlace con tag de referido.

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

### Requirement: Conversión de leads atribuidos
El sistema MUST asociar los contactos generados por un visitante al referidor correspondiente si existe una atribución activa.

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

### Requirement: Registro de oportunidades del agente

#### Scenario: Agente registra una propiedad captada o un cliente referido
- GIVEN un agente autenticado con KYC vigente
- WHEN registra un prospecto y confirma que la persona autorizó el contacto
- THEN el sistema MUST guardar los datos mínimos bajo el propietario agente
- AND MUST restringir la lectura al agente responsable y administración
- AND MUST registrar los cambios de estado en una bitácora append-only

### Requirement: Libro de comisiones

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

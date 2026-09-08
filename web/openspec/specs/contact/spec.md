# Proceso de Contacto

## Purpose
Define como los usuarios contactan a anunciantes desde catalogo, detalle y vistas moviles.

## Requirements

### Requirement: Contactar desde catalogo
El sistema MUST ofrecer acciones claras de contacto en cada tarjeta cuando exista informacion disponible.

#### Scenario: Ver acciones en tarjeta
- GIVEN una propiedad tiene datos de contacto
- WHEN el usuario visualiza la tarjeta
- THEN el sistema MUST mostrar acciones para consultar o contactar
- AND estas acciones MUST ser tactiles en movil
- AND no MUST interferir con la accion de abrir detalle

#### Scenario: Contacto no disponible
- GIVEN una propiedad no tiene telefono, WhatsApp o email valido
- WHEN se renderiza tarjeta, preview o detalle
- THEN el sistema MUST ocultar o deshabilitar acciones no disponibles
- AND MUST evitar enlaces rotos o botones que no hacen nada

### Requirement: Llamada telefonica en movil
El sistema MUST usar enlaces telefonicos validos cuando el usuario pulsa el icono de telefono.

#### Scenario: Tocar telefono
- GIVEN una propiedad tiene telefono valido
- WHEN el usuario toca el icono de telefono
- THEN el enlace MUST usar formato `tel:+...`
- AND el navegador/dispositivo MUST poder abrir el flujo nativo de llamada
- AND si no hay telefono valido el sistema MUST ocultar o deshabilitar la accion

#### Scenario: Telefono en escritorio
- GIVEN el usuario esta en escritorio y no existe marcador telefonico nativo confiable
- WHEN intenta contactar por telefono
- THEN el sistema MAY mostrar el numero o copiarlo
- AND MUST evitar depender de `tel:` como unica accion visible si no resuelve el caso desktop

### Requirement: Formulario de contacto en detalle
El sistema MUST permitir enviar un mensaje estructurado al anunciante desde la pagina de detalle.

#### Scenario: Enviar consulta
- GIVEN un usuario esta en el detalle de una propiedad
- WHEN completa nombre, telefono o WhatsApp y mensaje
- THEN el sistema MUST validar campos requeridos
- AND MUST registrar o enviar la consulta por el canal configurado
- AND MUST mostrar confirmacion o error entendible

#### Scenario: Vista previa de una propiedad pendiente
- GIVEN un usuario autorizado visualiza una propiedad que no esta publicada
- WHEN abre su pagina de detalle
- THEN el sistema MUST indicar que el contacto estara disponible despues de la publicacion
- AND MUST NOT mostrar el formulario, Turnstile ni acciones de contacto o reporte

#### Scenario: Verificacion anti-bot estable
- GIVEN el formulario publico de contacto muestra un desafio Turnstile
- WHEN Turnstile entrega un token valido y el formulario actualiza su estado
- THEN el widget MUST conservar la misma instancia aprobada
- AND MUST evitar reiniciar el desafio por cambios de callbacks de React
- AND el navegador MUST enviar el token y los datos al Worker principal de Cubitat
- AND el Worker principal MUST validar el token mediante `siteverify`
- AND el Worker principal MUST registrar la consulta solo despues de recibir `success: true`
- AND el navegador MUST NOT insertar directamente en `public.contacts`

#### Scenario: Impedir el bypass de Turnstile
- GIVEN un cliente intenta insertar una consulta directamente mediante la Data API de Supabase
- WHEN la solicitud no pasa por el endpoint protegido del Worker principal
- THEN RLS y los privilegios de tabla MUST rechazar la insercion
- AND solo una RPC reservada a `service_role` MAY registrar la consulta validada

#### Scenario: Conservar datos durante la verificacion anti-bot
- GIVEN el usuario completa el formulario publico de contacto
- WHEN el envio espera la validacion asincrona del token Turnstile
- THEN el sistema MUST conservar una instantanea valida del formulario enviado
- AND MUST registrar la consulta con los valores capturados antes de la espera
- AND MUST finalizar el estado de carga tanto ante exito como ante error

#### Scenario: Consulta desde boton principal
- GIVEN un usuario pulsa `Consultar` o accion equivalente en detalle
- WHEN existe formulario o modal de contacto
- THEN el sistema MUST enfocar o abrir el flujo de consulta
- AND MUST preservar la propiedad destino
- AND MUST evitar enviar datos sin consentimiento explicito

### Requirement: Privacidad de ubicacion y contacto
El sistema MUST evitar exponer datos sensibles innecesarios antes de una interaccion explicita.

#### Scenario: Ver contacto protegido
- GIVEN un usuario abre una propiedad
- WHEN todavia no envio consulta ni pulso llamada
- THEN el sistema MUST mostrar informacion suficiente para decidir
- AND MAY ocultar direccion exacta o datos sensibles del anunciante
- AND MUST revelar solo acciones necesarias para contactar

### Requirement: Canales de contacto consistentes
El sistema MUST mantener comportamiento consistente entre catalogo, detalle, mapa y favoritos.

#### Scenario: WhatsApp disponible
- GIVEN una propiedad tiene WhatsApp valido
- WHEN el usuario pulsa la accion WhatsApp
- THEN el sistema MUST abrir un enlace con mensaje contextual cuando sea posible
- AND MUST incluir referencia a la propiedad sin exponer datos sensibles innecesarios

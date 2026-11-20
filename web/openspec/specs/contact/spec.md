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

#### Scenario: Contactar desde la tarjeta y desde el detalle
- GIVEN una propiedad publicada tiene teléfono o WhatsApp válido
- WHEN el usuario pulsa `Contactar` desde la tarjeta del catálogo o desde la ficha
- THEN ambas acciones MUST solicitar el canal a través del Worker protegido
- AND `Contactar` MUST abrir el marcador telefónico nativo con el número del anuncio
- AND `Consultar` MUST abrir WhatsApp con un mensaje contextual sin enviarlo
- AND ambas acciones MUST conservar la propiedad actual y no recargar la página
- AND si el canal solicitado no existe, MUST ofrecer el formulario protegido de esa propiedad
- AND la API pública MUST NOT incluir teléfono ni `contact_info` en lecturas del catálogo

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
- AND el telefono MUST contener entre 7 y 15 digitos y solo separadores internacionales permitidos
- AND el Worker MUST repetir la validacion antes de verificar Turnstile o escribir datos
- AND MUST registrar o enviar la consulta por el canal configurado
- AND MUST mostrar confirmacion o error entendible
- AND el botón de envío MUST decir únicamente «Enviar mensaje» y no prometer que la consulta revelará el teléfono del anunciante

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

#### Scenario: Cambio de anuncio en el mismo componente
- GIVEN el detalle de un anuncio ya revelo un telefono
- WHEN el componente se reutiliza para mostrar otro anuncio
- THEN MUST descartar el contacto revelado y el token anterior
- AND MUST solicitar una verificacion nueva para el anuncio actual

#### Scenario: El anunciante no indicó un canal telefónico
- GIVEN el anuncio publicado no tiene teléfono ni WhatsApp
- WHEN el visitante completa la verificación de contacto
- THEN MUST explicar que el anunciante no indicó esos datos
- AND MUST ofrecer el formulario de consulta como alternativa
- AND MUST diferenciar esta situación de un fallo temporal del servicio

#### Scenario: Fallo temporal al consultar el contacto
- GIVEN Turnstile se verificó correctamente, pero el RPC protegido o Supabase no está disponible
- WHEN el Worker intenta resolver el teléfono y WhatsApp del anuncio
- THEN el Worker MUST responder con un error temporal (HTTP 503), no como contacto inexistente
- AND la interfaz MUST ofrecer un mensaje de reintento distinto del aviso de que el anunciante no indicó teléfono
- AND la interfaz MUST descartar el token Turnstile consumido y permitir completar un reto nuevo sin cerrar el diálogo
- AND MUST NOT exponer el error interno, número ni datos de otro anuncio

#### Scenario: Límite temporal de consultas de contacto
- GIVEN una persona superó el límite temporal de consultas desde su red
- WHEN el Worker responde HTTP 429 con `Retry-After`
- THEN la interfaz MUST explicar que alcanzó el límite temporal y cuánto esperar
- AND MUST NOT presentarlo como un teléfono inexistente ni como una caída genérica
- AND MUST NOT revelar datos privados mientras el acceso está limitado

#### Scenario: Reintentar contacto después de un fallo temporal
- GIVEN la verificación Turnstile ya fue aceptada y el primer intento de consultar el contacto falla temporalmente
- WHEN el usuario completa el nuevo reto Turnstile que aparece en el diálogo
- THEN el navegador MUST enviar un token nuevo al Worker
- AND MUST revelar el contacto si el segundo intento tiene éxito
- AND MUST mantener el diálogo abierto durante el reintento

### Requirement: Canales de contacto consistentes
El sistema MUST mantener comportamiento consistente entre catalogo, detalle, mapa y favoritos.

#### Scenario: WhatsApp disponible
- GIVEN una propiedad tiene WhatsApp valido
- WHEN el usuario pulsa la accion WhatsApp
- THEN el sistema MUST abrir el mismo canal WhatsApp desde catálogo y detalle con un enlace válido
- AND MUST incluir en el mensaje el título y la ubicación pública de la propiedad cuando sea posible
- AND MUST incluir referencia a la propiedad sin exponer datos sensibles innecesarios

#### Scenario: Cooldown local de consulta
- GIVEN existe una marca local de consulta reciente para el anuncio
- WHEN el visitante abre la ficha en una visita nueva
- THEN el sistema MUST explicar que hay un periodo de espera
- AND MUST NOT mostrarlo como una consulta enviada durante esta visita
- WHEN vence el periodo de cinco minutos
- THEN MUST volver a mostrar el formulario de contacto

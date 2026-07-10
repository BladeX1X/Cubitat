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

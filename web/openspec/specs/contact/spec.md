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

### Requirement: Llamada telefonica en movil
El sistema MUST usar enlaces telefonicos validos cuando el usuario pulsa el icono de telefono.

#### Scenario: Tocar telefono
- GIVEN una propiedad tiene telefono valido
- WHEN el usuario toca el icono de telefono
- THEN el enlace MUST usar formato `tel:+...`
- AND el navegador/dispositivo MUST poder abrir el flujo nativo de llamada
- AND si no hay telefono valido el sistema MUST ocultar o deshabilitar la accion

### Requirement: Formulario de contacto en detalle
El sistema MUST permitir enviar un mensaje estructurado al anunciante desde la pagina de detalle.

#### Scenario: Enviar consulta
- GIVEN un usuario esta en el detalle de una propiedad
- WHEN completa nombre, telefono o WhatsApp y mensaje
- THEN el sistema MUST validar campos requeridos
- AND MUST registrar o enviar la consulta por el canal configurado
- AND MUST mostrar confirmacion o error entendible

### Requirement: Privacidad de ubicacion y contacto
El sistema MUST evitar exponer datos sensibles innecesarios antes de una interaccion explicita.

#### Scenario: Ver contacto protegido
- GIVEN un usuario abre una propiedad
- WHEN todavia no envio consulta ni pulso llamada
- THEN el sistema MUST mostrar informacion suficiente para decidir
- AND MAY ocultar direccion exacta o datos sensibles del anunciante
- AND MUST revelar solo acciones necesarias para contactar


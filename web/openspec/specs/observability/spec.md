# Observabilidad segura del frontend

## Purpose
Conservar diagnostico operativo sin exponer errores crudos, arboles de
componentes, credenciales, identificadores, URLs ni datos personales.

## Requirements

### Requirement: Punto unico de salida a consola
El frontend MUST emitir eventos exclusivamente mediante el logger seguro.

#### Scenario: Error no capturado por React
- GIVEN un componente lanza un error inesperado
- WHEN `ErrorBoundary` lo captura
- THEN MUST registrar un unico evento clasificado
- AND MUST NOT imprimir el objeto `Error` ni `ErrorInfo`

#### Scenario: Nuevo uso directo de console
- GIVEN un archivo de produccion bajo `web/src`
- WHEN usa `console.log`, `console.warn`, `console.error`, `console.info` o
  `console.debug` fuera del logger autorizado
- THEN la suite de arquitectura MUST fallar

### Requirement: Codigos cerrados
El logger MUST aceptar como codigo visible solamente identificadores en
mayusculas y guion bajo.

#### Scenario: Caller sin tipos envia un mensaje libre como codigo
- GIVEN un caller inyecta correo, URL, token o texto libre en `code`
- WHEN el logger construye el evento
- THEN MUST reemplazarlo por `UNCLASSIFIED_ERROR`
- AND MUST NOT emitir el valor original

#### Scenario: Caller sin tipos altera los campos estructurales
- GIVEN un caller inyecta texto libre en `module`, `action` o `level`
- WHEN el logger construye el evento
- THEN MUST usar valores cerrados de respaldo
- AND MUST NOT emitir el valor original

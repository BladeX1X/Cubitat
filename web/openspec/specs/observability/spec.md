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

### Requirement: Retención de auditoría Auth en DEV/local
La implementación de retención MUST permanecer fuera de la cadena productiva
hasta una promoción posterior explícita y MUST conservar 90 días móviles.

#### Scenario: Simulación sin contenido sensible
- GIVEN existen eventos Auth anteriores al corte de 90 días
- WHEN `service_role` ejecuta la función de simulación
- THEN MUST devolver solo corte, conteo y rango temporal agregado
- AND MUST NOT devolver payload, IP, user-agent ni identificadores de eventos

#### Scenario: Cliente intenta acceder a retención
- GIVEN una sesión `anon` o `authenticated`
- WHEN intenta ejecutar preview o purga
- THEN MUST recibir permiso denegado

#### Scenario: Purga preparada pero no autorizada
- GIVEN la migración DEV/local fue aplicada
- WHEN no existe una autorización destructiva posterior
- THEN la purga MUST permanecer en modo simulación por defecto
- AND MUST NOT existir Cron ni invocación automática que elimine filas

#### Scenario: Ejecución servidor por lotes
- GIVEN una autorización posterior y eventos elegibles no protegidos
- WHEN `service_role` ejecuta explícitamente la purga con simulación desactivada
- THEN MUST eliminar como máximo 1000 filas por lote
- AND MUST omitir eventos dentro de una retención legal activa
- AND MUST registrar solo conteos agregados en el resultado

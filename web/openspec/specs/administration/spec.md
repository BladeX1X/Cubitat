# Proceso de Administracion y Moderacion

## Purpose
Define las capacidades internas para revisar usuarios, anuncios y reportes.

## Requirements

### Requirement: Acceso restringido
El sistema MUST limitar la administracion a usuarios con rol autorizado.

#### Scenario: Usuario sin rol admin abre moderacion
- GIVEN un usuario autenticado sin rol `admin`
- WHEN intenta abrir `/moderar`
- THEN el sistema MUST impedir el acceso
- AND MUST mostrar una respuesta segura o redirigir sin exponer datos internos

#### Scenario: Admin abre moderacion
- GIVEN un usuario autenticado con rol `admin`
- WHEN abre `/moderar`
- THEN el sistema MUST mostrar herramientas de revision disponibles
- AND MUST cargar datos necesarios de forma controlada

#### Scenario: Usuario anonimo abre moderacion
- GIVEN un usuario sin sesion
- WHEN intenta abrir `/moderar`
- THEN el sistema MUST abrir login o redirigir a inicio
- AND MUST evitar cualquier consulta de datos administrativos

### Requirement: Gestion de publicaciones
El sistema MUST permitir revisar estado y calidad de anuncios.

#### Scenario: Revisar publicacion
- GIVEN existe una propiedad publicada o pendiente
- WHEN un admin la revisa
- THEN el sistema MUST mostrar datos principales, propietario, contacto y estado
- AND el admin SHOULD poder cambiar estado cuando la interfaz lo permita
- AND toda accion sensible SHOULD quedar auditable

#### Scenario: Ocultar publicacion desde moderacion
- GIVEN un admin revisa una publicacion sospechosa o incumplidora
- WHEN elige ocultarla e indica motivo
- THEN el sistema MUST actualizar el estado a no publico
- AND MUST guardar o mostrar el motivo de moderacion cuando exista campo disponible
- AND MUST retirar la propiedad de resultados publicos

#### Scenario: Eliminar publicacion desde moderacion
- GIVEN un admin confirma eliminar una publicacion
- WHEN ejecuta la accion destructiva
- THEN el sistema MUST pedir confirmacion explicita
- AND MUST eliminar o marcar como eliminada la propiedad segun politica de datos
- AND MUST actualizar listas administrativas y publicas

#### Scenario: Moderacion evita acciones accidentales
- GIVEN una accion cambia visibilidad o elimina informacion
- WHEN el admin pulsa la accion
- THEN el sistema MUST requerir confirmacion
- AND SHOULD registrar razon, usuario admin, fecha y propiedad afectada cuando la infraestructura lo soporte

### Requirement: Gestion de reportes
El sistema MUST permitir analizar reportes de propiedades sospechosas.

#### Scenario: Revisar reporte
- GIVEN existe un reporte de propiedad
- WHEN un admin abre la vista de moderacion
- THEN el sistema MUST mostrar motivo, comentarios, propiedad asociada y fecha
- AND el admin SHOULD poder marcarlo como revisado o tomar accion sobre la propiedad

#### Scenario: Reporte referencia propiedad inexistente
- GIVEN existe un reporte sobre una propiedad eliminada o no disponible
- WHEN el admin abre moderacion
- THEN el sistema MUST mostrar el reporte sin romper la vista
- AND SHOULD indicar que la propiedad asociada no esta disponible

### Requirement: Gestion de usuarios
El sistema MUST permitir revisar usuarios solo a roles autorizados y con exposicion minima de datos.

#### Scenario: Admin revisa usuario
- GIVEN un admin abre una vista de usuarios o detalle de anunciante
- WHEN se cargan datos del usuario
- THEN el sistema MUST mostrar solo datos necesarios para operacion y moderacion
- AND MUST proteger emails, telefonos y metadatos sensibles contra acceso no autorizado

#### Scenario: Accion sobre usuario
- GIVEN un admin detecta abuso de un usuario
- WHEN la interfaz soporte pausar, marcar o escalar el usuario
- THEN el sistema MUST confirmar la accion
- AND SHOULD registrar razon y fecha
- AND MUST evitar aplicar cambios a usuarios fuera del alcance autorizado

### Requirement: Auditoria y trazabilidad
El sistema SHOULD dejar trazabilidad de acciones administrativas sensibles.

#### Scenario: Registrar accion administrativa
- GIVEN un admin oculta, elimina o modifica estado de una publicacion
- WHEN la accion se completa
- THEN el sistema SHOULD registrar admin, entidad afectada, accion, razon y timestamp
- AND MUST mostrar errores si no se pudo completar la accion

### Requirement: Moderacion asistida por IA
El sistema MAY usar revision automatica para ayudar al admin sin reemplazar la decision humana en acciones destructivas.

#### Scenario: Analisis automatico de publicacion
- GIVEN existe una publicacion nueva o editada
- WHEN el sistema ejecuta moderacion automatica
- THEN SHOULD evaluar texto, imagenes y datos de contacto contra politicas configuradas
- AND SHOULD marcar riesgos para revision humana
- AND MUST evitar publicar decisiones irreversibles sin control humano cuando el riesgo sea ambiguo

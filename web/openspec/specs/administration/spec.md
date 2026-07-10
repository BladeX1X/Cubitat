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

### Requirement: Gestion de publicaciones
El sistema MUST permitir revisar estado y calidad de anuncios.

#### Scenario: Revisar publicacion
- GIVEN existe una propiedad publicada o pendiente
- WHEN un admin la revisa
- THEN el sistema MUST mostrar datos principales, propietario, contacto y estado
- AND el admin SHOULD poder cambiar estado cuando la interfaz lo permita
- AND toda accion sensible SHOULD quedar auditable

### Requirement: Gestion de reportes
El sistema MUST permitir analizar reportes de propiedades sospechosas.

#### Scenario: Revisar reporte
- GIVEN existe un reporte de propiedad
- WHEN un admin abre la vista de moderacion
- THEN el sistema MUST mostrar motivo, comentarios, propiedad asociada y fecha
- AND el admin SHOULD poder marcarlo como revisado o tomar accion sobre la propiedad


# Proceso de Referidos y Crecimiento

## Purpose
Define el comportamiento de generación de códigos de referido, almacenamiento de visitas con atribución y conversión de prospectos asociados a un referidor.

## Requirements

### Requirement: Generación de códigos únicos
El sistema MUST asignar un identificador de referido único a cada usuario verificado o agente inmobiliario registrado.

#### Scenario: Usuario accede a su perfil y obtiene su código
- GIVEN un usuario autenticado en su panel de cuenta
- WHEN el sistema carga su información de perfil
- THEN el sistema MUST generar o recuperar su código de referido único (ej. `REF-XXXX`)
- AND MUST permitir copiar el código o un enlace directo para compartir

---

### Requirement: Atribución de visitas (Tracking)
El sistema MUST detectar y persistir la procedencia de una visita cuando se utiliza un enlace con tag de referido.

#### Scenario: Visitante entra mediante un enlace de referido
- GIVEN una URL con el parámetro `ref=REF-102` (ej. `cubitathome.com/propiedades/123?ref=REF-102`)
- WHEN la aplicación se carga en el navegador del visitante
- THEN el sistema MUST extraer el parámetro `ref` de la URL
- AND MUST almacenar el código de referido en el almacenamiento de sesión (`sessionStorage` o `localStorage`) para mantener la atribución durante la navegación
- AND MUST limpiar el parámetro de la barra de direcciones (URL limpia) para mejorar la estética y usabilidad sin perder la atribución almacenada

---

### Requirement: Conversión de leads atribuidos
El sistema MUST asociar los contactos generados por un visitante al referidor correspondiente si existe una atribución activa.

#### Scenario: Visitante atribuido envía un formulario de contacto
- GIVEN un visitante con un código de referido activo en su sesión (ej. `REF-102`)
- WHEN rellena y envía el formulario de contacto para cualquier propiedad
- THEN el sistema MUST persistir el lead en la tabla de contactos
- AND MUST registrar el identificador del referido en la columna `referral_id` o `source` para su posterior trazabilidad y cálculo de comisiones/métricas

#### Scenario: Visitante sin atribución envía contacto
- GIVEN un visitante sin código de referido en su sesión
- WHEN envía el formulario de contacto
- THEN el sistema MUST guardar el contacto con la columna de referido como nula o marcar la procedencia como orgánica (`direct` / `organic`)

---

### Requirement: Prevención de fraude
El sistema SHOULD evitar la auto-atribución o registros duplicados maliciosos.

#### Scenario: Usuario intenta auto-referirse
- GIVEN un usuario autenticado con el código `REF-102`
- WHEN intenta acceder a la web utilizando su propio enlace de referido
- THEN el sistema MUST ignorar la atribución para evitar auto-referidos en conversiones de su propia cuenta

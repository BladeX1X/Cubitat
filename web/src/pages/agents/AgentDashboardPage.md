# Panel privado del agente

## Responsabilidad

`AgentDashboardPage` comprueba el acceso de agentes verificados y presenta el
flujo de captación de usuarios mediante `AgentGrowthPanel`. La página no muestra
el resumen inmobiliario ni la lista de publicaciones del agente.

## Acceso

- Se requiere rol canónico `agent` o `admin` y KYC `verified`.
- Los administradores verificados también pueden acceder al panel.
- Si falla la consulta de perfil, se muestra un error seguro y una acción para
  reintentar; los usuarios no elegibles reciben acceso a Mi cuenta.

## Interfaz y datos

- La navegación de cuenta mantiene el acceso al panel.
- La sección principal invita a compartir el enlace personal de registro y
  permite recuperarlo, crearlo bajo acción explícita y copiarlo.
- El enlace guardado vuelve a cargarse después de una recarga; esa lectura no
  crea ni reactiva códigos.
- No se presentan oportunidades ni herramientas para gestionarlas, y tampoco
  publicaciones, vistas o contactos de inmuebles.
- Conteos de registros referidos y pagos confirmados quedan pendientes de una
  fuente de atribución y pagos verificada por servidor.

## Verificación

Las pruebas confirman la elegibilidad del agente, la ausencia de las secciones
retiradas y la continuidad del enlace personal de captación.

# ServiceDirectoryPage

F4-SVC muestra el directorio y el detalle sin depender de reputación. El panel
F4-REV se carga solo cuando `VITE_PHASE4_REV_ENABLED` está activo y recibe el
ID opaco del proveedor; reseñas, autoría, denuncias y moderación pertenecen al
módulo `service-reviews`.

## Responsabilidad

Presenta el directorio público de profesionales del hogar y el detalle de cada
perfil publicado. Permite filtrar en servidor por texto, categoría, provincia
y municipio, cargar resultados por páginas con total exacto, enviar una consulta
privada, proponer una reseña pendiente de moderación y navegar a la solicitud de
publicación de un perfil. La acción “Mis perfiles” abre una gestión privada;
solo perfiles no publicados se editan y los publicados no exponen edición hasta
definir el flujo de pausa/revisión.

## Reglas

- Solo se consultan perfiles publicados; no muestra información interna de
  moderación.
- El contacto telefónico se revela solo tras Turnstile validado por Worker;
  los teléfonos no se seleccionan desde el cliente ni aparecen en listados.
- La consulta privada continúa requiriendo cuenta autenticada.
- Una reseña queda pendiente; el promedio y los textos visibles vienen de RPCs
  públicas que solo proyectan opiniones aprobadas y no identifican al autor.
- Los errores de sesión se manejan sin exponer mensajes del proveedor.
- El componente se importa solo cuando el registro de capacidades habilita
  F4-SVC; el perfil productivo usa Supabase de producción y el perfil DEV usa
  Supabase DEV.

## Verificación

Revisar estados de carga/error/vacío, navegación hacia atrás, formulario,
Turnstile/contacto y layout móvil en DEV antes de habilitarlo en producción.

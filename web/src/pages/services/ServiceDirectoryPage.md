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
publicación de un perfil. El mapa opcional agrega conteos por provincia bajo
los filtros actuales (excepto la provincia seleccionada), sin exponer
coordenadas de perfiles ni reemplazar la paginación. La acción “Mis perfiles” abre una gestión privada;
solo perfiles no publicados se editan y los publicados no exponen edición hasta
definir el flujo de pausa/revisión.

## Reglas

- Solo se consultan perfiles publicados; no muestra información interna de
  moderación.
- El mapa se carga bajo demanda y usa conteos de todas las páginas que cumplen
  texto, categoría y municipio; seleccionar una provincia aplica el filtro del
  catálogo. El mapa muestra ubicaciones provinciales aproximadas, no domicilios.
- La barra de filtros reutiliza el patrón de Comprar: controles compactos en
  una fila arriba del catálogo y saltos a dos columnas o una columna según el
  ancho disponible. En desplazamiento de página permanece fija bajo el
  encabezado; en anchos reducidos, solo su contenido se desplaza horizontalmente.
  Categoría, provincia y municipio siguen siendo propios de Servicios.
- En móvil, mapa y estados de carga/error ocupan la pantalla y se cierran con el
  botón o Escape; en escritorio, al activar “Mostrar mapa”, filtros y tarjetas
  quedan en la columna izquierda y el mapa fijo al viewport en la derecha,
  siguiendo la presentación de Comprar/Rentar. El control “Mostrar mapa” queda
  fijo en la parte inferior para encontrarlo al desplazarse; en móvil se oculta
  mientras el mapa está abierto para dejar disponible el botón de cierre propio.
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

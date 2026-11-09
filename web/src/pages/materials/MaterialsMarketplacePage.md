# MaterialsMarketplacePage

## Responsabilidad

Presenta anuncios publicados de materiales de construcción con filtros por
texto del título, categoría, provincia y disponibilidad, detalle, precio
declarado, consulta privada para el vendedor y acceso a solicitud de publicación.
El catálogo pagina desde Supabase, muestra el total exacto de coincidencias y
permite cargar más resultados sin limitar la búsqueda al primer bloque. Un mapa
opcional muestra anuncios disponibles agrupados por provincia y aplica esa
provincia como filtro del catálogo.

## Reglas

- Solo anuncios `published` y no agotados aparecen en el catálogo.
- La opción pública de disponibilidad excluye anuncios agotados; no los revela
  ni presenta un conteo de cero como si fueran resultados disponibles.
- La ubicación municipal se mantiene pendiente: `material_listings` en la cadena
  productiva actual no tiene columna `municipality`. No se simula el filtro en
  el navegador ni se afirma cobertura municipal para materiales hasta preparar
  y reconciliar una migración de base de datos.
- El mapa se carga bajo demanda y cuenta todas las páginas que cumplen texto,
  categoría y disponibilidad (sin agotados); no presenta direcciones ni
  ubicaciones exactas y no ofrece un filtro municipal inexistente.
- En escritorio, los filtros permanecen en un panel lateral tanto con el mapa
  abierto como cerrado; en pantallas menores se apilan antes del catálogo.
- En móvil, mapa y estados de carga/error ocupan la pantalla y se cierran con el
  botón o Escape; en escritorio, al activar “Mostrar mapa”, filtros y tarjetas
  quedan en la columna izquierda y el mapa fijo al viewport en la derecha,
  siguiendo la presentación de Comprar/Rentar. El control “Mostrar mapa” queda
  fijo en la parte inferior para encontrarlo al desplazarse; en móvil se oculta
  mientras el mapa está abierto para dejar disponible el botón de cierre propio.
- La disponibilidad y el precio son declaraciones del vendedor, no garantía,
  reserva ni oferta contractual.
- Las consultas requieren cuenta autenticada y no crean órdenes ni pagos.
- Las imágenes se cargan bajo demanda y los estados de carga/error/vacío son
  visibles y accesibles. Si Storage no puede firmar una o más fotos privadas,
  el anuncio permanece disponible y muestra un aviso accesible de fotos no
  disponibles temporalmente; no se confunde con un anuncio sin imágenes.
- Los teléfonos no se consultan desde el navegador; Turnstile y Worker revelan
  contacto únicamente para anuncios publicados y disponibles.
- Los objetos privados se muestran mediante URL firmada temporal solo tras la
  lectura autorizada; el service worker no cachea las rutas `/object/sign/`.
- El componente se importa solo cuando el registro de capacidades habilita
  F4-MAT; el perfil productivo usa Supabase de producción y el perfil DEV usa
  Supabase DEV.

## Verificación

Revisar filtros, detalle, formatos, URL firmadas, Turnstile/contacto y móvil en
DEV antes de habilitarlo en producción.

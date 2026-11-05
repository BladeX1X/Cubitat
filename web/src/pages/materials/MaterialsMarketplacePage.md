# MaterialsMarketplacePage

## Responsabilidad

Presenta anuncios publicados de materiales de construcción con filtros por
categoría/provincia, detalle, precio declarado, disponibilidad, consulta
privada para el vendedor y acceso a solicitud de publicación.

## Reglas

- Solo anuncios `published` y no agotados aparecen en el catálogo.
- La disponibilidad y el precio son declaraciones del vendedor, no garantía,
  reserva ni oferta contractual.
- Las consultas requieren cuenta autenticada y no crean órdenes ni pagos.
- Las imágenes se cargan bajo demanda y los estados de carga/error/vacío son
  visibles y accesibles.
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

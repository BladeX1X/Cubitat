# Service worker

El service worker precarga la aplicación, enruta la navegación SPA y administra
notificaciones push. El caché `supabase-image-cache` solo admite respuestas
`200` de objetos públicos de Storage que sean seguros para compartir en el
navegador.

Las imágenes del bucket `property_images` no se guardan en el caché compartido.
Al activar una versión nueva, el worker elimina del caché las URLs públicas
heredadas de ese bucket, tanto desde el dominio Supabase como desde el proxy del
mismo origen. Si no puede borrar entradas selectivamente, elimina el caché de
imágenes completo para no conservar esas fotos. Las demás imágenes públicas
conservan su política de caché.

La regla de imágenes privadas y sus criterios de aceptación están en
`openspec/specs/media/spec.md`.

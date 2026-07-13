# useSEO

Actualiza los metadatos del documento durante la navegacion SPA.

- Siempre escribe titulo, descripcion, imagen, URL, tipo Open Graph y Twitter.
- Si una pagina omite valores opcionales, restaura los valores genericos de
  Cubitat en lugar de heredar los de la ruta anterior.
- La URL automatica usa solo origen y pathname para no copiar query strings,
  fragmentos ni parametros sensibles de autenticacion.
- Las rutas privadas y los entornos no canonicos se excluyen adicionalmente en
  el Worker mediante `X-Robots-Tag`.

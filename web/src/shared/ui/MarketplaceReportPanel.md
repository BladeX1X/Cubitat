# MarketplaceReportPanel

Formulario compartido de denuncia para fichas públicas de Servicios y
Materiales. El bloque y el diálogo siguen el mismo diseño de reporte de
Comprar, con textos adaptados al servicio o material. El acceso contextual abre
un diálogo modal; se puede cerrar con Escape, el botón de cierre o el fondo.
El diálogo identifica el anuncio y conserva motivo, detalle opcional, Turnstile,
estados de envío y confirmación. Envía el tipo e ID al Worker; la base valida que el anuncio siga
publicado y toma el título desde su propia fila. No se permite insertar directo
desde el navegador. Turnstile, límite de frecuencia y validación de longitud
protegen el endpoint. La ficha muestra estados de éxito y error.

Los reportes aparecen en la pestaña Moderación y pueden cerrarse como revisados
o descartados. Ninguna acción de marketplace pausa el anuncio automáticamente.

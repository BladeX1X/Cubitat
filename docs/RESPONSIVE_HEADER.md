# Encabezado responsive

El encabezado de Cubitat ofrece tres presentaciones: una fila en escritorio amplio, dos filas en ventanas de 621 a 1180 px y el panel móvil hasta 620 px. En el rango mediano, la navegación principal queda visible bajo la marca y las acciones; si los enlaces exceden el ancho disponible, la fila permite desplazamiento horizontal.

La validación de navegador está en web/e2e/header-responsive.spec.ts y cubre el viewport de 956×800 px que reproducía el hueco, además de 390×844 px para conservar el menú móvil.

Estado: integrado en main mediante PR #200 (commit 18c36a2) y desplegado en producción en Worker cubitat1, versión d19660f5-3a25-46a4-b3f9-280a9e77c016 al 100%. Verificado en https://cubitathome.com: el HTML carga los assets nuevos; E2E de producción pasa a 956×800 px y 390×844 px (2/2). Purga de caché Cloudflare completada. Sin escrituras en Supabase.

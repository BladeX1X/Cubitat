# Encabezado responsive

El encabezado de Cubitat ofrece tres presentaciones: una fila en escritorio amplio, dos filas en ventanas de 621 a 1180 px y el panel móvil hasta 620 px. En el rango mediano, la navegación principal queda visible bajo la marca y las acciones; si los enlaces exceden el ancho disponible, la fila permite desplazamiento horizontal.

La validación de navegador está en web/e2e/header-responsive.spec.ts y cubre el viewport de 956×800 px que reproducía el hueco, además de 390×844 px para conservar el menú móvil.

Estado: implementación en rama local bugfix/tablet-header-navigation; pendiente de validación integral y promoción. No se ha desplegado ni modificado producción.

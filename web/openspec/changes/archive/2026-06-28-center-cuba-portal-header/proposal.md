# Centrar Verticalmente y Horizontalmente el Encabezado de la Sección de Cuba

## Why
Actualmente, el contenedor `.section-heading` tiene un diseño flexbox horizontal (`flex-direction: row` implícito) que posiciona el título "El portal inmobiliario más grande de Cuba" y la descripción "Compra, venta y renta de inmuebles en toda Cuba" uno al lado del otro. Queremos que la descripción quede debajo del título y que ambos elementos se centren de manera elegante como en propriedades.com.

## What Changes
- Crear una nueva clase CSS `.section-heading-centered` en `app.css` con dirección de columna y alineación centrada.
- Reemplazar el contenedor `.section-heading` de la sección en `HomePage.tsx` por la nueva clase `.section-heading-centered`.

# Header

## Propósito
Mantener el logotipo de tuGao, las acciones de la cuenta y los accesos principales de Cubitat visibles en escritorio, ventanas medianas y móvil. El nombre del producto, las rutas y las etiquetas de navegación siguen usando Cubitat.

## Comportamiento responsive
- Más de 1180 px: marca, navegación principal y acciones en una fila.
- Entre 621 y 1180 px: marca y acciones arriba; navegación principal en una segunda fila horizontal y desplazable si el ancho disponible no alcanza.
- Hasta 620 px: se ocultan los enlaces de escritorio y se usa el botón «Abrir menú» con el panel móvil.
- En móvil, los accesos «Servicios» y «Materiales» también permanecen visibles como botones directos bajo la marca, sin abrir el menú.
- El panel móvil muestra Servicios y Materiales inmediatamente debajo del encabezado del menú, antes de las opciones de cuenta; sus botones usan las etiquetas visibles «Servicios» y «Materiales».
- La postulación «Ser agente» se inicia desde Mi cuenta y no aparece en la navegación pública ni en el menú móvil.

## Accesibilidad
- La navegación principal conserva su etiqueta accesible.
- El botón del menú móvil expone aria-expanded y cambia su nombre entre abrir y cerrar.
- Las operaciones siguen disponibles dentro del menú móvil.
- Los accesos de Servicios y Materiales se distinguen y quedan en la primera sección del menú móvil.

## Validación
La prueba E2E e2e/header-responsive.spec.ts comprueba la navegación a 956 px y el menú a 390 px.

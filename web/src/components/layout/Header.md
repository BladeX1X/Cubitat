# Header

## Propósito
Mantener la marca, las acciones de la cuenta y los accesos principales de Cubitat visibles en escritorio, ventanas medianas y móvil.

## Comportamiento responsive
- Más de 1180 px: marca, navegación principal y acciones en una fila.
- Entre 621 y 1180 px: marca y acciones arriba; navegación principal en una segunda fila horizontal y desplazable si el ancho disponible no alcanza.
- Hasta 620 px: se ocultan los enlaces de escritorio y se usa el botón «Abrir menú» con el panel móvil.

## Accesibilidad
- La navegación principal conserva su etiqueta accesible.
- El botón del menú móvil expone aria-expanded y cambia su nombre entre abrir y cerrar.
- Las operaciones siguen disponibles dentro del menú móvil.

## Validación
La prueba E2E e2e/header-responsive.spec.ts comprueba la navegación a 956 px y el menú a 390 px.

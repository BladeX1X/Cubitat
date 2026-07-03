# Replicar Estructura y Secciones del Dropdown de Sugerencias

## Why
El dropdown de sugerencias actual simplemente lista todas las sugerencias filtradas sin orden ni secciones. En la página de referencia (propiedades.com), las sugerencias están categorizadas bajo títulos específicos (como "ZONAS MÁS BUSCADAS") y proveen una acción rápida adicional ("Usar mi ubicación") bajo el título "TAMBIÉN PUEDES BUSCAR CON".

## What Changes
Modificar `SearchBar.tsx` para:
- Estructurar el dropdown de sugerencias en dos secciones principales con cabeceras en mayúsculas de tamaño pequeño:
  1. "TAMBIÉN PUEDES BUSCAR CON" conteniendo la opción estática "Usar mi ubicación".
  2. "ZONAS MÁS BUSCADAS" conteniendo las sugerencias filtradas.
- Aplicar estilos CSS para las cabeceras (texto gris, tamaño pequeño, transformación a mayúsculas, espaciado adecuado).
- Agregar soporte visual y el comportamiento de la opción "Usar mi ubicación".

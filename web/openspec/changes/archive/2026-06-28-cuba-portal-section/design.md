# Diseño Técnico: Sección Portal Inmobiliario de Cuba

## Cambios en JSX (`src/pages/home/HomePage.tsx`)
Modificaremos el componente `PopularLocations` para cambiar su título, subtítulo y listado:
- Cambiaremos el nombre del componente o mantendremos `PopularLocations` pero con contenido actualizado.
- Nueva estructura del listado `locations`:
  ```typescript
  const locations = [
    ['Departamentos en renta La Habana', 'https://images.unsplash.com/photo-1500673922987-e212871fec22?auto=format&fit=crop&w=600&q=80'],
    ['Casas en renta Varadero', 'https://images.unsplash.com/photo-1563297058-29cf9a3e6a69?auto=format&fit=crop&w=600&q=80'],
    ['Departamentos en renta Santiago de Cuba', 'https://images.unsplash.com/photo-1585938338392-50a599993541?auto=format&fit=crop&w=600&q=80'],
    ['Casas en venta Holguín', 'https://images.unsplash.com/photo-1570129476815-ba368ac77013?auto=format&fit=crop&w=600&q=80'],
    ['Departamentos en venta Villa Clara', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80'],
    ['Casas en renta Camagüey', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'],
    ['Casas en venta Cienfuegos', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80'],
    ['Departamentos en renta Miramar', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80'],
  ]
  ```
- El subtítulo será renderizado debajo del título principal `<h2>` usando una etiqueta `<p className="section-description">`.
- Cambiaremos el texto del enlace a `Ver propiedades →`.

## Cambios en CSS (`src/styles/app.css`
Ajustaremos `.location-grid-cards` para asegurar que tenga 4 columnas en pantallas de escritorio:
```css
.location-grid-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-top: 32px;
}
```
Agregaremos `.section-description` para estilizar el subtítulo secundario en gris con tamaño de fuente intermedio (ej. `15px` o `16px`).

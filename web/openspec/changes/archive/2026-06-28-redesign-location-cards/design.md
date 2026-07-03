# Diseño Técnico: Rediseño de las Tarjetas de Provincia

## Arquitectura y Componentes
Modificaremos el componente `PopularLocations` que se encuentra dentro de `src/pages/home/HomePage.tsx`.

## Cambios en el HTML/JSX:
Reemplazaremos la estructura actual de enlaces (`<a>` con un `<span>` y un `<strong>` para el conteo) por una estructura de tarjeta moderna:
```tsx
<div className="location-grid-cards">
  {locations.map(([name, count, image]) => (
    <a key={name} href="/resultados" className="location-card">
      <div className="location-card-image" style={{ backgroundImage: `url(${image})` }} />
      <div className="location-card-content">
        <h3>{name}</h3>
        <span className="location-card-action">Ver inmuebles</span>
      </div>
    </a>
  ))}
</div>
```

Para las imágenes, utilizaremos URLs de Unsplash con temas relacionados a Cuba o paisajes urbanos representativos (o imágenes de marcador de posición estéticas si no disponemos de las locales).
Las ubicaciones y sus imágenes correspondientes serán:
1. La Habana: `https://images.unsplash.com/photo-1500673922987-e212871fec22?auto=format&fit=crop&w=400&q=80` (o similar Cuba)
2. Santiago de Cuba
3. Villa Clara
4. Camaguey
5. Holguin
6. Cienfuegos

## Cambios en el CSS (`src/styles/app.css`):
Agregaremos los estilos para `.location-grid-cards` y `.location-card` al final del archivo.
Usaremos variables CSS del tema como `var(--radius)` y una tipografía premium.
Utilizaremos `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` para un diseño responsivo.

## Plan de Regresión:
No tocaremos ninguna otra regla de `.hero`, `.operation-tabs` o `.login-modal` en `app.css`. Los estilos se limitarán a `.location-grid-cards`, `.location-card`, `.location-card-image`, `.location-card-content` y `.location-card-action`.

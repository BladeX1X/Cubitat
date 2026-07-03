# Diseño Técnico: Encabezado Centrado de la Sección de Cuba

## Estilos CSS (`src/styles/app.css`):
Agregaremos la clase `.section-heading-centered` en `app.css`:
```css
.section-heading-centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 26px;
}
```

## Estructura JSX (`src/pages/home/HomePage.tsx`):
Modificaremos la cabecera en el componente `PopularLocations` de `HomePage.tsx`:
```tsx
      <div className="section-heading-centered">
        <h2>El portal inmobiliario más grande de Cuba</h2>
        <p className="section-description">Compra, venta y renta de inmuebles en toda Cuba.</p>
      </div>
```

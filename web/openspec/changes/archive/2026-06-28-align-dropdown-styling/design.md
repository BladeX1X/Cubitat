# Diseño Técnico: Alineación de Estilo de Dropdown

## Componentes y Arquitectura
Modificaremos las clases de Tailwind del dropdown de sugerencias en `src/modules/search/components/SearchBar.tsx`.

## Detalles de Estilo
El dropdown de Tipo de Propiedad (`SelectContent`) usa los siguientes estilos CSS:
- `margin-top: 8px`
- `border: 1px solid rgba(0, 139, 105, 0.18)`
- `border-radius: 10px`
- `box-shadow: var(--shadow)`
- `background: #fff`
- `padding: 6px`

Los elementos de lista (`SelectItem`) usan:
- `min-height: 48px`
- `padding: 10px 26px`
- `border-radius: 6px`
- `color: var(--ink)`
- `font-size: 18px`
- `font-weight: 520`
- `:focus` / hover state: `background: var(--blue-soft)`, `color: var(--green-dark)`

Aplicaremos estos mismos valores como clases Tailwind de utilidad en `SearchBar.tsx` para garantizar que ambos menús desplegables se vean idénticos.

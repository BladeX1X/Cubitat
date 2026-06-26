# Cubitat web

Aplicacion web de Cubitat construida con React + Vite + TypeScript.

## Enfoque de Fase 1

- PWA mobile-first.
- Arquitectura modular.
- Mapa open source desacoplado por adaptadores.
- Datos mock iniciales listos para migrar a Supabase.
- Experiencia de busqueda tipo portal inmobiliario.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Estructura

```text
src/
  app/
  shared/
  modules/
    properties/
    search/
    maps/
    auth/
    admin/
    contact/
    referrals/
```

El resto de la aplicacion usa `PropertyMap`; el proveedor real del mapa queda encapsulado en `modules/maps/adapters`.

Proveedor actual: `MapLibre GL JS` con tiles de `OpenFreeMap`. Si luego se decide autohospedar mapas o cambiar de proveedor, el cambio debe quedar contenido dentro del modulo `modules/maps`.

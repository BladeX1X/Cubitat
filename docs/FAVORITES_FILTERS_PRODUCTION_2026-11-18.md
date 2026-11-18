# Favoritos filtrables — despliegue de producción — 2026-11-18

## Implementación

- PR #247: https://github.com/BladeX1X/Cubitat/pull/247
- Rama de código desplegada: `bugfix/favorites-category-filters-20261118`, commit `8867dd4`.
- Los filtros Propiedades, Servicios y Materiales operan localmente en `/favoritos`; «Todos» restaura la lista combinada. El conteo, selección accesible y estado vacío siguen la categoría elegida.
- No hay migraciones, escrituras de datos ni cambios de Supabase para esta corrección.

## Validación antes del release

- `npm run lint`: PASS.
- `npm run test:run`: 248 archivos, 1,132 pruebas PASS y 1 omitida.
- `npm run build`: PASS.
- `npm run build:phase4-production:ci`: PASS, con guardas del perfil productivo.
- Los checks remotos `quality` y `database-security` de GitHub Actions no iniciaron por el bloqueo de facturación/límite de gasto de la cuenta. El PR sigue abierto y sin integrar; este deploy manual no cambia ese estado.

## Despliegue manual y comprobación

- Se usó el procedimiento manual protegido de Wrangler para `production`, con confirmación explícita `DEPLOY PRODUCTION`.
- Worker `cubitat1`, versión `f85c0e18-81b2-4059-8001-43e4dab5f823`, al 100 % del tráfico; creación 2026-11-18 17:30:44 UTC.
- El build Fase 4 se generó con `build:phase4-production:ci`. Al no disponer del permiso de lectura de API Keys de Supabase, se preservó el `robots.txt` y el sitemap productivos actuales: 446 URLs canónicas `https://cubitathome.com/`; no se publicó el fallback local de 2 URLs.
- Smoke HTTP posterior: `/`, `/favoritos`, `/resultados?operacion=venta`, `/servicios`, `/materiales`, `/sw.js` y `/sitemap.xml`: HTTP 200.
- QA autenticado de solo lectura en producción: «Todos» mostró 5 anuncios; «Propiedades» mostró 5 propiedades; «Servicios» y «Materiales» mostraron 0 y su estado vacío. La URL se mantuvo en `/favoritos` al filtrar y «Todos» restauró la lista. La cuenta no tenía guardados de Servicios ni Materiales, por lo que se verificó su estado vacío, no tarjetas de esas categorías.

## Límites y seguimiento

- Producción está desplegada y los filtros fueron comprobados desde la interfaz real.
- PR #247 sigue pendiente de integración por la disponibilidad de GitHub Actions. Cuando se restablezcan los runners, ejecutar los checks remotos y completar la integración; no volver a desplegar si el código no cambia.
- No se modificó la base de datos ni se enviaron mensajes/contactos.

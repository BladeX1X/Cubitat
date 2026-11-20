# Google Indexación Y Analytics

## Objetivo

Cada vez que Cubitat publique una ruta pública nueva, debe quedar disponible para Google mediante `sitemap.xml` y debe medirse en Google Analytics.

## URLs Importantes

- Search Console sitemap: <https://search.google.com/search-console/sitemaps?resource_id=sc-domain%3Acubitathome.com>
- Google Analytics: <https://marketingplatform.google.com/intl/es/about/analytics/>

## Archivos Públicos

El build publica:

```txt
https://cubitathome.com/sitemap.xml
https://cubitathome.com/robots.txt
```

`robots.txt` apunta al sitemap:

```txt
Sitemap: https://cubitathome.com/sitemap.xml
```

## Regenerar Sitemap

Cuando se agregue una página pública nueva, una nueva categoría SEO o propiedades públicas de ejemplo, ejecutar:

```bash
cd web
npm run seo:sitemap
```

Luego:

```bash
npm run build
git add public/sitemap.xml public/robots.txt scripts/generate-sitemap.mjs package.json
git commit -m "chore: update sitemap"
git push
```

Cloudflare volverá a desplegar.

El generador usa la conexión directa cuando están disponibles ambas variables
públicas de Supabase. Si no están, lee los campos públicos de propiedades
publicadas mediante el proxy del mismo entorno objetivo (producción o DEV), sin
necesitar permisos de API Keys ni incluir credenciales en el proceso de build.
Si ese inventario no responde o devuelve datos inválidos, el build falla para
evitar publicar un sitemap incompleto. `--static` se reserva para builds que
explícitamente no deben incluir inventario dinámico.

Los perfiles completos de producción también necesitan `VITE_SUPABASE_ANON_KEY`
para inicializar el cliente público del navegador; el proxy es un fallback del
generador del sitemap y no reemplaza esa configuración de la aplicación.

## Qué Debe Entrar Al Sitemap

Sí incluir:

- `/`
- `/resultados`
- páginas de resultados públicas importantes
- URLs públicas de propiedades publicadas
- futuras páginas públicas: blog, guías, zonas, categorías

No incluir:

- `/mi-cuenta`
- `/favoritos`
- `/mis-propiedades`
- `/editar/...`
- `/auth/callback`
- `/recuperar-contrasena`

## Enviar Sitemap A Google

En Search Console:

1. Abrir la propiedad de dominio `cubitathome.com`.
2. Ir a **Sitemaps**.
3. Enviar:

```txt
sitemap.xml
```

4. Confirmar que Google lo lee sin errores.

## Google Analytics

Cubitat ya tiene integración opcional mediante:

```txt
VITE_GA_MEASUREMENT_ID
```

En Cloudflare Workers/Pages configurar esa variable con el ID de medición de GA4:

```txt
G-XXXXXXXXXX
```

La app carga `gtag` solo si existe esa variable. Como Cubitat es SPA, `src/shared/lib/analytics.ts` envía `page_view` cuando cambia la ruta interna.

## Checklist Al Agregar Algo Nuevo

1. Si es público e indexable, agregarlo al generador de sitemap.
2. Ejecutar `npm run seo:sitemap`.
3. Ejecutar `npm run build`.
4. Subir cambios a GitHub.
5. Esperar deploy en Cloudflare.
6. Revisar `https://cubitathome.com/sitemap.xml`.
7. Reenviar sitemap en Search Console si el cambio es importante.
8. Verificar eventos/page views en Analytics.

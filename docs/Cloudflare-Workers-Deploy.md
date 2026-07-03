# Cloudflare Workers Deploy

## Contexto

Cloudflare puede mostrar el flujo nuevo de **Workers** en lugar del flujo clásico de **Pages**. Para Cubitat esto funciona bien porque la aplicación es React + Vite y se publica como archivos estáticos en `web/dist`.

## Configuración En Cloudflare

En el proyecto conectado a GitHub:

```txt
Repository:
BladeX1X/Cubitat

Root directory / Path:
web

Build command:
npm run build

Deploy command:
npx wrangler deploy
```

## Configuración Del Repositorio

El archivo `web/wrangler.jsonc` define:

- `assets.directory = ./dist/`
- `assets.not_found_handling = single-page-application`

Esto es necesario para que rutas internas como `/publicar`, `/resultados`, `/mi-cuenta` o `/propiedad/...` carguen `index.html` y no den 404.

## Variables De Entorno

En Cloudflare, configurar variables para producción:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

No subir `.env` real al repositorio.

## Dominio

Después del deploy:

1. Ir al Worker desplegado.
2. Entrar a **Settings** o **Domains & Routes**.
3. Agregar ruta o dominio personalizado:

```txt
cubitathome.com
www.cubitathome.com
```

Como el dominio fue comprado en Cloudflare, el DNS debería poder configurarse desde el mismo panel.

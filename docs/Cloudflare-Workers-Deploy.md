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

## Perfil integral de Fase 2 en producción

El Worker productivo `cubitat1` debe compilarse con:

```txt
Build command: npm run build:phase2-production
Deploy command: npx wrangler deploy
Root directory: /web
Production branch: main
```

`npm run build` conserva un perfil base para comprobar el aislamiento modular; no usarlo en el trigger productivo, porque reemplazaría los módulos completos de Fase 2. Cloudflare Workers Builds ejecuta la compilación y el despliegue en cada push a la rama de producción. La configuración vigente fue comprobada en Cloudflare el 2026-10-11 y persistió tras recargar el panel. Ver matriz y evidencia en `docs/FASE2_ESTADO.md`.

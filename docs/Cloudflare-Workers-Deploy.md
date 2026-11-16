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
npm run build:phase4-production

Deploy command:
npx wrangler deploy
```

El flujo conectado de Cloudflare ejecuta primero su Build command y después
`npx wrangler deploy`. Para publicaciones manuales desde una terminal, usa los
scripts del repositorio: `npm run deploy` ejecuta lint, pruebas y el build
integral de producción antes de pedir la confirmación `DEPLOY PRODUCTION` y
llamar a Wrangler. En DEV usa `npm run deploy:phase2-dev`; este construye el
perfil DEV, pide `DEPLOY DEV` y despliega con `wrangler.phase2-dev.jsonc`.
Ambos comandos requieren una terminal interactiva y se detienen si falla una
validación o la confirmación. `npm run cf:deploy` es un alias de producción.

## Worker de QA DEV combinado (Fases 3 y 4)

El Worker `cubitat1-phase2-dev` usa el perfil combinado `phase34-dev`. En
Cloudflare Workers Builds, configura el repositorio `BladeX1X/Cubitat`, el
directorio raíz `web`, el comando de build `npm run build:phase34-dev` y el
comando de despliegue `npx wrangler deploy --config wrangler.phase34-dev.jsonc`.
El proyecto Supabase y el origen deben ser los de DEV; la clave pública
`VITE_SUPABASE_ANON_KEY` se configura como variable de build en Cloudflare y no
se guarda en el repositorio. No uses aquí `wrangler.jsonc`, que apunta al
Worker productivo.

En la pestaña **Previews Base**, mantén también la raíz `web`, el comando de
build `npm run build:phase34-dev` y la variable de build
`VITE_SUPABASE_ANON_KEY` del proyecto DEV. La configuración de **Production** y
la de previews son independientes; dejar la raíz de previews en `/` hace que
Cloudflare busque `package.json` fuera de `web` y falle con `ENOENT` antes de
compilar. El comando de preview existente es `npx wrangler preview`.

El perfil verifica las UIs de F3/F4 y excluye las referencias productivas antes
de generar el bundle. Para una publicación manual, usa
`npm run deploy:phase34-dev`, que solicita confirmación interactiva antes de
desplegar.

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

## Perfil integral de Fase 4 en producción

El Worker productivo `cubitat1` debe compilarse con:

```txt
Build command: npm run build:phase4-production
Deploy command: npx wrangler deploy
Root directory: /web
Production branch: main
```

La configuración remota de Cloudflare no se modifica con estos scripts. El
guard aplica a las publicaciones manuales mediante npm; en Cloudflare Builds,
mantén el Build command del perfil integral seguido por el Deploy command.

`npm run build` conserva un perfil base para comprobar el aislamiento modular; no usarlo en el trigger productivo, porque reemplazaría los módulos completos de Fases 2, 3 y 4. Cloudflare Workers Builds ejecuta la compilación y el despliegue en cada push a la rama de producción. Comprueba en el Dashboard que su Build command sea `npm run build:phase4-production`; si usa un perfil anterior, cada push puede volver a ocultar módulos F4. El build de CI debe mantenerse en `npm run build:phase4-production:ci` y nunca ser el comando de despliegue.

Verificación posterior: el merge de PR #130 (`3e46bec`) disparó el build `6086639e-5c26-4b49-876a-b6d1045d2067`; build y deploy terminaron en verde usando el comando anterior, y la versión `98c825b6-a653-48b1-9c60-6ea76bf40e06` quedó activa al 100%. El smoke autenticado volvió a mostrar los módulos KYC, Documentos y Coincidencias pHash.

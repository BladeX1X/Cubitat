# PWA de Cubitat

## Objetivo

Cubitat funciona como Progressive Web App para que el usuario pueda instalar el portal, cargarlo rapido en conexiones lentas y recibir una experiencia clara cuando cambia la conectividad o existe una version nueva.

## Capacidades actuales

- Manifest generado por `vite-plugin-pwa` con nombre, colores, iconos y `display: standalone`.
- Service worker generado por Workbox mediante `VitePWA`.
- Registro automatico con `registerType: 'autoUpdate'`.
- Prompt de instalacion para navegadores compatibles con `beforeinstallprompt`.
- Opcion permanente `Instalar Cubitat` en el menu movil cuando se navega desde
  la web.
- Instrucciones especificas para iOS y navegadores sin `beforeinstallprompt`.
- Aviso visible cuando el navegador queda offline.
- Aviso breve cuando la conexion vuelve.
- Aviso de actualizacion disponible con boton `Actualizar`.
- Cache runtime unicamente para recursos publicos de Supabase Storage.
- Exclusion de MapLibre del precache para evitar descargar el motor de mapas al instalar/actualizar la PWA.

## Archivos principales

- `web/vite.config.ts`
  - Configura `VitePWA`.
  - Define manifest, runtime caching y precache.
  - Separa chunks por vendor con `manualChunks`.
  - Excluye `vendor-maplibre-*.js/css` del precache.
- `web/src/components/layout/PWAInstallPrompt.tsx`
  - Registra el service worker con `virtual:pwa-register`.
  - Muestra prompts de instalacion, offline/online y update.
- `web/src/styles/app.css`
  - Define `.pwa-toast-*` y posicionamiento desktop/mobile.
- `web/src/vite-env.d.ts`
  - Declara tipos de Vite y `vite-plugin-pwa/client`.

## Estrategia de cache

### Precache

El precache debe contener el app shell y recursos livianos necesarios para iniciar la aplicacion.

No se precachea MapLibre:

```ts
globIgnores: ['**/vendor-maplibre-*.js', '**/vendor-maplibre-*.css']
```

Motivo: MapLibre pesa alrededor de 1 MB minificado. Es util solo cuando el usuario abre mapas; precachearlo castiga instalacion, actualizaciones y conexiones lentas.

### Runtime cache

Supabase REST no se cachea en el service worker. Las respuestas pueden depender
de la sesion, el rol, RLS o cambios recientes y una copia anterior provocaria
estados inconsistentes despues de un `F5`.

Supabase storage publico:

- Estrategia: `CacheFirst`
- Uso: imagenes publicas.
- Ventaja: reutiliza imagenes vistas y reduce trafico.

## Flujo de instalacion

Android/Chrome/Edge:

1. El navegador dispara `beforeinstallprompt`.
2. El componente guarda el evento.
3. Se muestra el aviso `Instalar Cubitat`.
4. El boton `Instalar app` llama `prompt()`.

Descubrimiento manual:

1. El usuario abre el menu movil y pulsa `Instalar Cubitat`.
2. Si el navegador ya entrego `beforeinstallprompt`, se ofrece `Instalar app`.
3. Si no existe instalador nativo disponible, se explica como abrir el menu del
   navegador y elegir `Instalar aplicacion` o `Anadir a pantalla de inicio`.
4. Esta opcion manual sigue funcionando aunque el aviso automatico se haya
   descartado anteriormente.

iOS:

1. No existe `beforeinstallprompt`.
2. Se muestra un aviso con instrucciones:
   - Compartir.
   - Añadir a pantalla de inicio.

Si el usuario cierra el prompt, se guarda:

```txt
localStorage.cubitat_pwa_prompt_dismissed = true
```

Este valor oculta solamente la invitacion automatica. No elimina la opcion
manual del menu.

## Flujo de actualizacion

`registerSW` ejecuta `onNeedRefresh` cuando existe una version nueva del service worker.

La UI muestra:

- Titulo: `Actualizacion disponible`.
- Accion secundaria: `Luego`.
- Accion primaria: `Actualizar`.

Al pulsar `Actualizar`, se llama:

```ts
updateServiceWorker(true)
```

Esto activa el nuevo service worker y recarga la pagina para usar la version nueva.

### Aislamiento durante desarrollo local

El servidor Vite no debe quedar controlado por un service worker generado por
un build anterior. En modo `serve`, `/sw.js` responde con un worker temporal sin
cache que:

1. toma control inmediatamente;
2. elimina los caches PWA del origen local;
3. desregistra el service worker;
4. recarga las ventanas locales una sola vez.

De esta forma, una recarga normal (`F5`) vuelve a solicitar los modulos actuales
de Vite. La limpieza es exclusiva de DEV y no modifica el service worker
Workbox generado para produccion. Tampoco borra cookies, sesion, LocalStorage ni
datos de usuario.

## Flujo offline/online

El componente escucha eventos del navegador:

- `offline`: muestra aviso persistente `Sin conexion`.
- `online`: oculta offline y muestra aviso temporal `Conexion restaurada`.

El aviso offline no promete que todas las acciones funcionen. El texto indica que solo se mostrara lo guardado y que algunas acciones pueden fallar hasta reconectar.

## Decisiones de UI

- Los avisos viven en un stack fijo `.pwa-toast-stack`.
- En desktop aparecen abajo a la derecha.
- En mobile aparecen sobre la bottom nav.
- En paginas de resultados y detalle, donde la bottom nav se oculta o cambia el CTA, el stack baja al borde seguro.
- Se usa `aria-live="polite"` para anunciar cambios sin interrumpir al usuario.

## Checklist de mantenimiento

- Ejecutar `npm run build` despues de tocar `vite.config.ts` o PWA.
- Revisar el total de precache reportado por `vite-plugin-pwa`.
- Mantener `vendor-maplibre` fuera del precache salvo que exista una razon fuerte.
- Probar instalacion en Chrome Android y Safari iOS antes de release.
- Probar update flow desplegando dos versiones consecutivas.
- En local, confirmar que `/sw.js` devuelve JavaScript sin cache y que dos
  recargas normales consecutivas muestran la version actual sin `Ctrl+F5`.
- Probar offline en DevTools: Application > Service Workers > Offline.
- No cachear respuestas REST de Supabase ni datos autenticados en el service
  worker.

## Estado validado

Ultima validacion local:

- `npm run build`: correcto.
- `npm run test:run`: 82 archivos y 317 pruebas aprobadas (2026-07-27).
- `/sw.js` DEV: `application/javascript`, `no-cache, no-store` y worker de
  autolimpieza verificado.
- Dos recargas normales en Chrome conservaron la version actual y la sesion.
- Precache de produccion: 45 entradas, aproximadamente 1076 KB.
- Supabase REST queda fuera de `runtimeCaching`; solo se cachean imagenes
  publicas de Storage.

# PWA de Cubitat

## Objetivo

Cubitat funciona como Progressive Web App para que el usuario pueda instalar el portal, cargarlo rapido en conexiones lentas y recibir una experiencia clara cuando cambia la conectividad o existe una version nueva.

## Capacidades actuales

- Manifest generado por `vite-plugin-pwa` con nombre, colores, iconos y `display: standalone`.
- Service worker generado por Workbox mediante `VitePWA`.
- Registro automatico con `registerType: 'autoUpdate'`.
- Prompt de instalacion para navegadores compatibles con `beforeinstallprompt`.
- Instrucciones especificas para iOS/Safari, donde no existe `beforeinstallprompt`.
- Aviso visible cuando el navegador queda offline.
- Aviso breve cuando la conexion vuelve.
- Aviso de actualizacion disponible con boton `Actualizar`.
- Cache runtime para Supabase REST y storage publico.
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

Supabase REST:

- Estrategia: `NetworkFirst`
- Uso: datos de propiedades y endpoints REST.
- Ventaja: intenta datos frescos, pero puede responder desde cache si la red falla.

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

iOS/Safari:

1. No existe `beforeinstallprompt`.
2. Se muestra un aviso con instrucciones:
   - Compartir.
   - Añadir a pantalla de inicio.

Si el usuario cierra el prompt, se guarda:

```txt
localStorage.cubitat_pwa_prompt_dismissed = true
```

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
- Probar offline en DevTools: Application > Service Workers > Offline.
- No cachear respuestas autenticadas sensibles con `CacheFirst`.

## Estado validado

Ultima validacion local:

- `npm run build`: correcto.
- `npm run test:run -- ResultsPage FilterBar`: correcto.
- Precache despues de excluir MapLibre: aproximadamente 844 KB.

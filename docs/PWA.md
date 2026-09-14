# PWA de Cubitat

## Objetivo

Cubitat funciona como Progressive Web App para que el usuario pueda instalar el portal, cargarlo rapido en conexiones lentas y recibir una experiencia clara cuando cambia la conectividad o existe una version nueva.

## Capacidades actuales

- Manifest generado por `vite-plugin-pwa` con nombre, colores, iconos y `display: standalone`.
- Service worker propio compilado por Workbox mediante `VitePWA` en modo
  `injectManifest`.
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
- Web Push por dispositivo para usuarios autenticados, con destino interno al
  tocar la notificacion.

## Archivos principales

- `web/vite.config.ts`
  - Configura `VitePWA`.
  - Define manifest, runtime caching y precache.
  - Separa chunks por vendor con `manualChunks`.
  - Excluye `vendor-maplibre-*.js/css` del precache.
- `web/src/components/layout/PWAInstallPrompt.tsx`
  - Registra el service worker con `virtual:pwa-register`.
  - Muestra prompts de instalacion, offline/online y update.
- `web/src/sw.ts`
  - Conserva el precache y cache de imagenes publicas.
  - Muestra los mensajes Push y abre solamente rutas internas del sitio.
- `web/src/modules/notifications/push/PushNotificationSettings.tsx`
  - Permite activar o desactivar el navegador actual desde Mi cuenta.
- `web/src/worker/push-notifications.ts`
  - Registra suscripciones autenticadas y entrega la cola mediante Cron.
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
2. Chrome consulta `getInstalledRelatedApps()` para detectar una instalacion
   web del mismo origen declarada en `related_applications` del manifest.
3. Si Cubitat ya esta instalada, se indica que debe abrirse desde su icono en la
   pantalla de inicio y no se vuelve a ofrecer la instalacion.
4. Si el navegador ya entrego `beforeinstallprompt`, se ofrece `Instalar app`.
5. Si Android no tiene instalador nativo disponible, se indica abrir el menu de
   Chrome y elegir solamente `Instalar aplicacion`.
6. Esta opcion manual sigue funcionando aunque el aviso automatico se haya
   descartado anteriormente.

iOS:

1. No existe `beforeinstallprompt`.
2. El menu muestra `Como instalar Cubitat`, no una accion automatica.
3. Se muestra una guia visible con los pasos reales de Safari:
   - Pulsar Compartir.
   - Seleccionar `Añadir a pantalla de inicio`.
   - Confirmar `Añadir`.
4. La deteccion incluye iPadOS cuando Safari solicita la version de escritorio.
5. Si Cubitat ya se ejecuta como PWA, la opcion de instalacion se oculta.

Si el usuario pulsa `Quizas luego`, se guarda la fecha del descarte en
milisegundos:

```txt
localStorage.cubitat_pwa_prompt_dismissed = <timestamp>
```

La invitacion automatica permanece oculta durante 7 dias y vuelve a ofrecerse
despues de ese plazo. Los valores antiguos `true` se migran a una fecha al
leerlos. La preferencia oculta solamente la invitacion automatica y no elimina
la opcion manual del menu.

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

## Notificaciones Web Push

El usuario las activa expresamente en `Mi cuenta`. El permiso del navegador se
solicita solo al pulsar `Activar notificaciones`; nunca durante la carga de la
pagina. Cada navegador instalado mantiene su propia suscripcion y puede
desactivarse sin afectar otros dispositivos.

En iOS/iPadOS, Cubitat indica primero que debe instalarse desde Safari mediante
`Compartir > Anadir a pantalla de inicio`. La opcion Push se habilita cuando la
aplicacion se ejecuta desde esa instalacion. Android y navegadores de escritorio
compatibles pueden activarla directamente.

La migracion `20260911010000_add_web_push.sql` crea las suscripciones y una cola
por dispositivo. El Worker reclama lotes cada minuto, reintenta hasta tres veces
y elimina endpoints que el proveedor marque como vencidos (`404` o `410`). Los
secretos VAPID y `SUPABASE_SERVICE_ROLE_KEY` permanecen exclusivamente en el
Worker.

Al tocar una notificacion, el service worker acepta unicamente un `action_path`
del mismo origen. Reutiliza una ventana abierta de Cubitat o abre la propiedad o
seccion indicada.

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
- Probar activacion, recepcion y clic en Chrome Android y en una PWA instalada
  desde Safari en iOS antes de habilitar el lanzamiento.

## Estado validado

Ultima validacion local (2026-09-11):

- `npm run build`: correcto.
- `npm run test:run`: 103 archivos y 425 pruebas aprobadas.
- `/sw.js` DEV: `application/javascript`, `no-cache, no-store` y worker de
  autolimpieza verificado.
- Dos recargas normales en Chrome conservaron la version actual y la sesion.
- Precache de produccion: 42 entradas, aproximadamente 1040 KB (2026-09-11).
- Supabase REST queda fuera de `runtimeCaching`; solo se cachean imagenes
  publicas de Storage.
- Web Push desplegado en produccion el 2026-09-11 como Worker
  `96d3368b-8935-42ad-bd54-0f240acfccee`. Migraciones 52 a 54 sincronizadas,
  `db lint --linked` sin errores, secretos VAPID presentes y Cron real con
  resultado `ok`. Queda pendiente probar permiso, recepcion y clic en
  dispositivos fisicos.
- Deteccion de PWA ya instalada y texto especifico para Chrome Android cubiertos
  por pruebas automatizadas; queda pendiente confirmar el resultado en un
  dispositivo Android fisico despues del despliegue.

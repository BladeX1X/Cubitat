# QA física de Push Fase 2

Este checklist valida únicamente el proyecto DEV y no requiere usar claves de
servicio desde el navegador. La prueba debe hacerse con una cuenta DEV de
prueba y una propiedad/notificación controlada.

## Preparación común

- Usar `https://cubitat1-phase2-dev.pochiprats18.workers.dev`.
- Registrar la versión DEV probada; la versión desplegada durante la última
  verificación es `97259d81-46cd-42e9-a2d0-4784390d458b`. Si se despliega otra
  versión, sustituir este valor en el registro de la prueba.
- Iniciar sesión con una cuenta DEV de prueba.
- En `Mi cuenta`, confirmar que el bloque muestra `Las notificaciones están
  activas en este dispositivo`.
- Mantener a mano una segunda cuenta DEV para generar una notificación legítima
  mediante el flujo normal de alertas/contacto.
- Antes de repetir una prueba, comprobar que no queda una suscripción antigua
  o un permiso bloqueado; si se limpia el dispositivo, volver a activar la
  suscripción desde la PWA instalada.
- Registrar fecha, dispositivo, navegador, cuenta de prueba y resultado. No
  registrar tokens, cookies ni claves.

## Android / Chrome

1. Abrir DEV en Chrome y agregar Cubitat a la pantalla de inicio.
2. Abrir la PWA instalada, iniciar sesión y activar notificaciones desde `Mi
   cuenta`.
3. Cerrar completamente la PWA y bloquear la pantalla.
4. Generar una notificación desde la segunda cuenta usando el flujo normal.
5. Confirmar que aparece en la bandeja del sistema sin abrir primero Cubitat.
6. Tocar la notificación y comprobar que abre el `action_path` correcto,
   conserva el origen DEV y enfoca o abre la PWA.
7. Volver a `Mi cuenta` y confirmar que el aviso ya no aparece en la bandeja
   interna.

## iOS / Safari

1. Abrir DEV en Safari y usar `Compartir → Añadir a pantalla de inicio`.
2. Abrir la aplicación desde el icono instalado, iniciar sesión y activar
   notificaciones.
3. Cerrar la aplicación y bloquear el dispositivo.
4. Generar una notificación desde la segunda cuenta usando el flujo normal.
5. Confirmar que aparece en el Centro de notificaciones.
6. Tocar la notificación y comprobar navegación al destino interno y retirada
   del aviso de la bandeja de Cubitat.

En iOS, anotar la versión del sistema y confirmar que la prueba se ejecutó
desde el icono instalado en la pantalla de inicio; una pestaña normal de Safari
no valida el mismo ciclo de vida de Push.

## Cobertura automatizada ya comprobada

- Las pruebas unitarias cubren la detección de iOS, las instrucciones de
  instalación, el caso de aplicación ya instalada, el recordatorio de siete
  días y el estado `ios_install_required` de Push.
- La comprobación focalizada del 2026-09-28 pasó 4 archivos y 27 pruebas:
  `pushService`, `PushNotificationSettings`, el Service Worker Push y el
  enrutamiento del Service Worker.
- El endpoint `/api/push/vapid-public-key` respondió `200` en DEV y
  producción; el método `POST` inválido respondió `405` en ambos entornos.
- La auditoría E2E pública de DEV valida las rutas principales sin credenciales
  ni datos persistentes.
- Estas pruebas no sustituyen la matriz física: la recepción en el Centro de
  notificaciones o en la bandeja del sistema solo se puede cerrar con un
  dispositivo real y la aplicación completamente cerrada.

## Resultado esperado

| Caso | Resultado observable |
| --- | --- |
| Permiso concedido | El bloque de cuenta muestra notificaciones activas |
| App cerrada | La notificación aparece en el sistema, sin abrir antes la app |
| Click push | Se abre el destino interno correcto |
| Lectura | El aviso desaparece de la bandeja interna |
| Seguridad | No se abandona el origen DEV ni se muestra otra cuenta |
| Error temporal | La entrega queda reintentable y no se pierde silenciosamente |

## Prueba tecnica DEV - 2026-09-29

- Se creo una notificacion interna marcada `Prueba Push QA`, dirigida solo a
  la cuenta DEV de prueba; no se uso produccion ni se envio un mensaje a un
  tercero.
- La cola creo una entrega para la suscripcion de la PWA y el Worker la marco
  como `sent` tras un intento.
- La recepcion visible en la bandeja del telefono, el click y la retirada del
  aviso interno siguen pendientes de confirmacion fisica.

## Evidencia reportada por el usuario - Android - 2026-09-29

- Push recibido en el telefono: **si**.
- La notificacion se pulso correctamente, abrio `/mi-cuenta` y el aviso quedo
  retirado de la bandeja interna.

Resultado Android: **verificado** para recepcion, apertura y lectura.

## Evidencia a adjuntar

- Captura de la configuración activa.
- Captura de la notificación del sistema con la app cerrada.
- Captura del destino abierto después del click.
- Registro del resultado por dispositivo y sistema operativo.
- Versión del Worker DEV y estado final de la suscripción después de la prueba.

## Registro por dispositivo

Completar una fila por combinación de dispositivo y sistema. No anotar tokens,
cookies, claves ni identificadores privados de Push.

| Fecha/hora | Dispositivo y SO | Navegador/PWA | Versión Worker | Permiso | App cerrada | Push recibido | Click abrió destino | Aviso interno retirado | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09-29 | Android / SO por registrar | Chrome / PWA instalada | DEV actual | Concedido | Si | Si | Si | Si | Verificado por el usuario; queda registrar modelo/SO exactos |
| Pendiente | iOS / SO por registrar | Safari / PWA instalada | `97259d81-46cd-42e9-a2d0-4784390d458b` | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Requiere dispositivo real |

Una fila solo puede marcarse como aprobada cuando `Push recibido`, `Click
abrió destino` y `Aviso interno retirado` tienen evidencia observable. Una
prueba con la pestaña del navegador abierta no cierra el caso de aplicación
instalada.

Hasta completar esta matriz, el requisito de Push se considera implementado
técnicamente pero no verificado físicamente.

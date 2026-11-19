# Mis Publicaciones

La pantalla carga únicamente las publicaciones del usuario autenticado y permite
administrarlas sin depender de enlaces públicos de Storage para sus fotos
privadas.

## Portadas privadas

`createOwnedPropertyCoverPreviews` acepta solo referencias canónicas del proxy
del Worker para `property_images/<UUID del dueño>/<UUID>.webp` y el nombre
heredado `<13 dígitos de timestamp>-<índice de 0 a 19>.webp`; confirma
que la carpeta coincide con la sesión y descarga con `Storage.download`. La tarjeta usa
una URL `blob:` temporal. La lista limita concurrencia, espera un máximo de ocho
segundos, rechaza archivos mayores de 5 MiB o que no sean WebP y muestra el
placeholder si la descarga falla. Los errores transitorios de red, 408, 429 y
5xx se reintentan una vez con una espera breve; los errores de permisos no se
repiten. Las URLs temporales se revocan al recargar la lista o desmontar la
pantalla. No se exponen tokens ni rutas privadas en errores.

Las referencias externas ya permitidas conservan su comportamiento actual. Las
fotos que no pasan por el proxy o no corresponden al dueño no se descargan.

## Portada del borrador local

La tarjeta del borrador local toma su primera imagen desde IndexedDB (`data:image/...`), donde el formulario conserva las fotos preparadas. La miniatura no genera una solicitud remota. Si IndexedDB o la foto no están disponibles, se conserva el placeholder y el anuncio local sigue apareciendo.

## Filtro de publicaciones

La lista permite filtrar en memoria por todas, en revisión, publicadas,
rechazadas, borradores y ocultas. Los botones muestran el total de cada grupo,
los grupos sin anuncios quedan deshabilitados y el cambio no recarga la página.
Las publicaciones rechazadas conservan el motivo indicado por moderación.

## Verificación

`privateImagePreviews.test.ts` cubre descarga de portada propia, rechazo de
otra carpeta, fallback ante error de Storage y revocación de URLs. `MyPropertiesPage.test.tsx`
confirma que la tarjeta muestra la preview autenticada.

## Regresión de integración — 2026-11-13

`e2e/my-properties.spec.ts` recorre Mis publicaciones con sesión simulada y una publicación con portada privada. Verifica la descarga autenticada por Storage, la preview temporal `blob:`, que no se muestre el fallback «Sin imagen» y que no haya escrituras de propiedades. Es una prueba local con APIs simuladas; no valida Storage remoto.

La regresión también espera `naturalWidth > 0`, por lo que confirma que el navegador decodificó la miniatura y no solo que recibió una URL `blob:`. La prueba local pasó el 2026-11-13; Storage real permanece fuera del alcance de esta comprobación.

La prueba E2E de `my-properties.spec.ts` usa cuatro estados simulados y confirma
que «En revisión», «Rechazadas», «Borradores» y «Todas» muestran el conjunto
correspondiente; el motivo de rechazo sigue visible. También comprueba que el
documento no desborda horizontalmente a 320 px con esos datos sintéticos.

### Contraste del bundle activo de DEV — 2026-11-13

La ruta pública del Worker para `/mis-propiedades` y los bundles del helper/página responden HTTP 200. El helper servido incluye validación de carpeta del propietario, lectura con `Storage.download` y compatibilidad con la ruta proxy `/api/supabase`; la tarjeta consume `cover_preview_url`. Esto confirma que el código está presente en el Worker, no que las fotos de la cuenta real carguen correctamente.

### QA visual autenticado en DEV — 2026-11-13

En Mis publicaciones se observaron 12 tarjetas: 11 anuncios con portadas privadas y un borrador local sin foto. Las 11 imágenes cargaron completas (`naturalWidth` mayor que cero) mediante URLs temporales `blob:`. El borrador usó el placeholder previsto. No se editó ni guardó ninguna publicación. La verificación local de Storage mock no era prueba suficiente; esta lectura autenticada sí confirma la carga real en esa sesión.

## Errores al eliminar una publicación

Al confirmar el borrado, la tarjeta entra en estado de carga y deshabilita sus acciones. Solo se retira de la lista cuando Supabase confirma la eliminación; ante error se conserva y se muestra un aviso accesible para reintentar. Una eliminación confirmada muestra un mensaje de éxito.

`e2e/my-properties.spec.ts` simula un rechazo 403 y verifica que la publicación sigue visible, que se anuncia el error y que no se repite la petición. El E2E pasó en Chromium local y contra el Worker DEV desplegado el 2026-11-14. La respuesta fue interceptada por la prueba; no se borró ningún anuncio remoto.
## Diagnóstico DEV de portadas privadas — 2026-11-15

Una lectura agregada de 20 propiedades DEV encontró 12 referencias privadas bajo el proxy actual, con carpeta igual a `user_id` y objeto correspondiente en Storage; los 12 objetos son WebP y ninguno supera 55,362 B. Las ocho referencias restantes son HTTPS externas. No se leyeron títulos, rutas o IDs. El frontend acepta el patrón y descarga cada portada con la sesión del dueño para crear un preview `blob:`. Esto descarta referencias privadas faltantes o de formato distinto a nivel agregado; no verifica el permiso de descarga de la sesión afectada. La reproducción visual autenticada queda pendiente.

### Bundle activo de Mis publicaciones — comprobación HTTP — 2026-11-15

El `index` actual de DEV importa los chunks de Mis publicaciones y miniaturas privadas. El chunk del helper responde HTTP 200 e incluye `Storage.download` y `URL.createObjectURL`; confirma que el código está desplegado, no que la solicitud autenticada del dueño haya tenido éxito.

### Retest posterior al despliegue — matriz E2E DEV — 2026-11-15

`my-properties.spec.ts` pasó 1/1 contra el Worker DEV, junto con otros 55 casos de mapas, fichas, contacto, favoritos, publicación, edición, búsqueda, Servicios, Materiales y responsive. En este recorrido Playwright interceptó las respuestas de autenticación/Storage; confirma que los bundles y la lógica simulada funcionan, pero no verifica la descarga bajo la sesión real del propietario. El error visual informado sigue abierto hasta inspeccionar esa respuesta autenticada.

### Revisión de Storage de portadas — read-only DEV — 2026-11-15

Consulta agregada sin devolver nombres, rutas ni IDs: los 26 objetos actuales del bucket `property_images` tienen MIME `image/webp`; tamaño máximo 66,374 bytes. `pg_policies` confirma SELECT autenticado de imágenes propias en la carpeta del usuario y lectura anónima solo cuando la foto está referenciada por una propiedad publicada. Esto descarta un MIME/tamaño excesivo o la ausencia global de política de propietario, pero no acredita el JWT ni la respuesta `Storage.download` de la sesión afectada. No se modificó la base; la inspección autenticada en Chrome sigue pendiente.

## Reintento de portadas privadas — desplegado en DEV — 2026-11-15

- `createOwnedPropertyCoverPreviews` y la preview de edición reintentan una vez los fallos transitorios de red, HTTP 408, 429 y 5xx; no reintentan errores permanentes 4xx. Mantienen el límite de ocho segundos y el placeholder si falla el segundo intento.
- TDD: la regresión demostró primero ambos fallos; después pasó con retry 503→éxito y sin retry para 403. Focal 11/11; lint PASS; Vitest 236 archivos, 1,084 PASS/1 omitida; build estándar y `build:phase34-dev` PASS.
- Worker DEV `cubitat1-phase2-dev` versión `36efd098-375e-46d0-b0e7-a38d6f8ff83e`. Verificados `/mis-propiedades` y el chunk nuevo con HTTP 200 y guard de retry presente.
- El fallo visual de la cuenta propietaria sigue abierto: no se observó aún la respuesta real de Storage en Chrome. Esta mejora cubre fallos transitorios, no demuestra que sea la causa original. Producción intacta.
Retest posterior del Worker DEV `36efd098-375e-46d0-b0e7-a38d6f8ff83e`: `my-properties.spec.ts` pasó 2/2 en Chromium. El E2E usa autenticación y Storage interceptados; confirma la interfaz publicada y ausencia de escrituras, no la descarga real con la cuenta del propietario.
El retest de Chromium se reforzó: la primera descarga de portada responde 503 y la segunda entrega la imagen; naturalWidth confirma que decodificó. 2/2 E2E PASS contra el Worker DEV con respuestas simuladas, sin escrituras. La descarga de Storage con JWT propietario real sigue pendiente.

## Incidencia productiva observada — 2026-11-18

En una publicación rechazada de la cuenta autenticada, la referencia privada existente de portada no cargó en el editor; el estado mostró «No se pudo cargar esta foto» y `0.0 KB` incluso tras un reintento manual. La miniatura vacía en Mis publicaciones puede corresponder a una descarga fallida, no solo a la ausencia de referencia. La causa aún no está confirmada porque no se capturó la respuesta autenticada de Storage. No se guardó ni alteró la publicación durante esta inspección.

Contraste de datos productivos (solo lectura, 2026-11-18): para el caso observado, la referencia de portada y la de galería apuntan a objetos presentes en el bucket privado, ambos con propietario/carpeta coincidentes, `image/webp` y 26,540 bytes. La política autenticada de propietario existe. Ese contraste por sí solo no probaba la descarga del navegador; la causa se confirmó después comparando el nombre de archivo con el validador.

### Causa confirmada: nombres heredados de fotos — 2026-11-18

La comparación de referencias de la publicación con el validador confirmó que
portada y galería usan el patrón legado de archivo `<timestamp>-<índice>.webp`,
mientras el helper solo admitía nombres UUID. Por eso devolvía `null` antes de
pedir la imagen a Storage; no era un fallo de permiso ni un objeto ausente. El
helper admite ahora ambos nombres, pero mantiene la carpeta UUID del propietario,
el bucket/host permitido y el límite de tamaño y MIME. La prueba focal local
confirma que se descarga el patrón legado y rechaza nombres arbitrarios, índices
fuera de rango y carpetas ajenas. El E2E del editor también reanuda un borrador
con una referencia timestamp-índice, conserva esa foto al guardar y agrega otra;
usa APIs simuladas y no verifica una escritura remota. El cambio se desplegó a
producción el 2026-11-18 como Worker `cubitat1`, versión
`379dc861-e684-45b1-a557-b81c9ceb113d`; despliegues posteriores desde una rama
sin el arreglo volvieron a servir el validador UUID-only. En ese momento, Chrome
no permitió abrir la pestaña para la verificación final; el retest posterior se
documenta abajo.

### Retest tras el despliegue actual — 2026-11-18

Actualización de estado: el Worker `cubitat1` versión
`db52d8f6-3753-4544-8067-a6ae4f211682` sirve el helper con compatibilidad para
los nombres heredados y quedó al 100 %. En el editor autenticado, la foto fallida
cargó y mostró 25.9 KB tras `Ctrl+Shift+R`, que obtuvo el bundle nuevo después
de que una recarga normal mantuviera la copia PWA anterior. No se guardó ni
modificó la publicación ni Supabase. Lint PASS; Vitest 248 archivos, 1,138 PASS/
1 omitida; E2E focal 1/1 y build `phase4-production` con sitemap dinámico de
446 URLs y guards PASS. PR #256 abierta; preview DEV PASS; Actions no asignó
runners por el bloqueo de pagos/límite de gasto.

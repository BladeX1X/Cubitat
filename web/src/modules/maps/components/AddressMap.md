# AddressMap

Mapa interactivo para elegir coordenadas privadas durante la publicación y edición de inmuebles, servicios y materiales.

## Carga y recuperación

- Carga MapLibre y el estilo OpenFreeMap; el formulario no depende de que el mapa cargue para continuar.
- Muestra un estado de carga mientras espera el evento `load` y limita esa espera a 15 segundos.
- La descarga compartida del estilo se limita a 12 segundos, aborta su petición y libera la caché de la promesa al fallar; así el botón de reintento puede iniciar una descarga nueva.
- Si falla la inicialización antes del primer `load` o vence el tiempo, informa del problema y ofrece `Reintentar mapa`.
- Un fallo aislado de tesela se registra con categoría y código seguros, sin URL ni texto original; errores equivalentes se limitan por instancia. No desmonta el mapa si la carga puede continuar. La pérdida del contexto WebGL sí activa recuperación.
- Al cambiar provincia o municipio, el mapa vuela al centro aproximado disponible. Al cargar o modificar coordenadas desde el formulario (incluida la ubicación del dispositivo), centra la vista en ese punto y sincroniza el marcador. Al quitar las coordenadas, elimina el marcador.
- El reintento cancela la inicialización anterior y conserva el resto del formulario y las coordenadas actuales.
- Configura el worker JavaScript empaquetado de MapLibre mediante `configureMapLibreWorker`; sin ello el fallback SPA puede servir HTML al worker y dejar el mapa en blanco aunque el estilo y los controles estén presentes.
- `AddressMap.test.tsx` cubre fallos de estilo/runtime, errores de tesela antes y después de `load`, la deduplicación de eventos, la recuperación y el límite de espera.

## Reproducción en Chromium local — 2026-11-13

Con la misma selección de provincia/municipio del formulario (La Habana / Playa), Chromium cargó el estilo, TileJSON, mosaicos vectoriales, fuentes y sprites de OpenFreeMap; las respuestas observadas fueron HTTP 200. MapLibre emitió `load`, retiró el indicador y dibujó el lienzo con calles y etiquetas. El mapa no quedó totalmente vacío en esta reproducción, aunque el centro muestra bastante costa y agua. Es evidencia local con recursos reales del proveedor, no QA del Worker DEV ni de la computadora del anunciante. No se guardó ningún anuncio.
# AddressMap — verificación del formulario

El mapa de dirección se monta después de seleccionar provincia y municipio. La
prueba E2E debe completar ambas selecciones antes de buscar el canvas de
MapLibre; la pantalla inicial solo muestra la instrucción de ubicación.

## Evidencia en DEV — 2026-11-14

Playwright Chromium contra `cubitat1-phase2-dev` seleccionó La Habana y Playa,
esperó el canvas visible y confirmó que el worker empaquetado y las teselas de
OpenFreeMap respondieron correctamente. La sesión y las lecturas de anuncios
fueron sintéticas; no se creó ni modificó ninguna publicación. Esto verifica
que el mapa puede cargar en DEV, pero no valida coordenadas guardadas en una
fila real de propiedad.

El mismo E2E marca una ubicación, guarda el borrador local, recarga y comprueba
que las coordenadas vuelven a mostrarse. Otro caso bloquea la primera descarga
del estilo y confirma que `Reintentar mapa` recupera el canvas tras la segunda
petición. En viewport móvil (390×844) también marca una ubicación sin desborde
horizontal. Los tres casos pasan localmente y contra la UI de DEV el 2026-11-14.

## Prueba E2E determinista de error de tesela — 2026-11-14

El escenario de fallo de una tesela en `e2e/address-map.spec.ts` sirve un estilo mínimo y una ruta de vector tiles controlada, y aborta exactamente una solicitud `.pbf`. Así se prueba que el error de una tesela no desmonta el mapa sin depender de que OpenFreeMap emita una URL con sufijo/versión específicos. Los escenarios vecinos siguen comprobando la carga real del estilo y teselas OpenFreeMap. La suite local completa pasó: 34 E2E y 3 omitidas por falta de credenciales/autorización de escrituras.

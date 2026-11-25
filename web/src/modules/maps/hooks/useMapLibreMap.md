# useMapLibreMap

## Responsabilidad

Compartir entre Comprar y Servicios/Materiales el ciclo de vida de MapLibre:
crear y retirar el mapa, cargar el estilo remoto, instalar controles comunes,
esperar la disponibilidad del estilo, observar redimensionados y recuperar
errores de carga mediante reintento.

El hook recibe un `containerRef`, opciones de cámara y opcionalmente un callback
de error seguro. Devuelve `mapRef`, `status` (`loading`, `ready` o `error`) y
`retry`. No define fuentes de datos, capas, selección ni filtros; estos siguen
siendo responsabilidad del adaptador o mapa provincial que lo consume.

`MapLibreStatusOverlay` comparte la presentación accesible de carga, fallo y
reintento. Servicios y Materiales mantienen sus conteos provinciales para no
publicar la ubicación de cada anuncio.

## Verificación

`useMapLibreMap.test.tsx` cubre controles comunes, estilo listo,
redimensionamiento, limpieza y reintento después de fallo. `ProvinceAggregateMap`
conserva además pruebas de selección provincial, expansión de grupos y controles
móviles.

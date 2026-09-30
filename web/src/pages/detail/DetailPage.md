# DetailPage

La ficha pública muestra galería, datos técnicos, ubicación aproximada, contacto y propiedades similares.

## Privacidad de dirección — 2026-09-11

`publicPropertyLocation` acepta únicamente municipio y provincia del catálogo cubano. Se aplica al texto de ubicación, breadcrumbs y mensaje de contacto para proteger también datos legacy o caché anterior. No deduce barrios ni calles desde texto ambiguo.

La barrera de datos es la migración `20260911060000_private_property_addresses.sql`: conserva íntegra la entrada en una tabla privada protegida por RLS y guarda solo zona en `properties.location`. El propietario recupera su dirección mediante el repositorio de edición. La migración debe aplicarse antes de desplegar ese repositorio. No se ha aplicado remotamente como parte de esta corrección.

Pruebas: `DetailPage.test.tsx` usa una dirección sintética completa y verifica que no aparezca en HTML ni en parámetros SEO.

## Privacidad de coordenadas — 2026-09-12

El mapa público representa una zona aproximada sobre una cuadrícula de `0.02` grados, sin pin de domicilio exacto y con aviso visible. El cliente vuelve a aproximar datos antiguos antes de dibujarlos para cubrir cachés previas.

La migración `20260912010000_private_property_coordinates.sql` conserva el punto exacto en `property_private_coordinates`, protegido por RLS para el propietario, y deja solo la cuadrícula aproximada en `properties.coordinates`. La migración corrige registros existentes y el trigger aplica la misma separación a futuras altas y ediciones. Debe aplicarse antes de desplegar el repositorio que recupera las coordenadas privadas.

## Área aproximada del mapa — 2026-09-23

`DetailLocationMap` dibuja la zona pública como un polígono GeoJSON de `2 km` de radio mediante `createApproximateLocationArea`, no como un `circle-radius` en píxeles. Al acercar o alejar el mapa cambia su tamaño en pantalla, pero conserva la misma región geográfica aproximada.

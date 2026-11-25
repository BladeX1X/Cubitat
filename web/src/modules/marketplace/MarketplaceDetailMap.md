# MarketplaceDetailMap

## Responsabilidad

Carga MapLibre de forma diferida para el visor de Servicios y Materiales y
muestra una referencia cartográfica pública sin coordenadas privadas.

## Privacidad de la ubicación

- La ficha no muestra pin ni marcador de ubicación.
- El área visual tiene 500 m de radio (1 km de diámetro). Su centro se desplaza
  entre 120 y 240 m con rumbo y distancia seudoaleatorios derivados del ID del
  anuncio respecto a la referencia pública aproximada.
- El desplazamiento permanece estable entre renderizados y es distinto por
  anuncio. No consulta ni revela las coordenadas privadas del anunciante.
- Si solo hay una provincia, se usa su referencia provincial aproximada.
- El mapa no muestra una tarjeta flotante de texto; la sección mantiene un
  nombre accesible para lectores de pantalla.

## Recuperación

El mapa conserva el estado de carga, el error recuperable y el control para
reintentar. Solo se monta al abrir la pestaña Mapa.

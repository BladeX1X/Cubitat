# Modulo de Media

## Purpose
Define el manejo de imagenes usadas en publicaciones, catalogo y detalle.

## Requirements

### Requirement: Normalizacion de imagenes
El sistema MUST normalizar imagenes de propiedades para que catalogo y detalle usen una galeria consistente.

#### Scenario: Propiedad con imagen principal y galeria
- GIVEN una propiedad tiene `cover_image` e imagenes adicionales
- WHEN el sistema renderiza una tarjeta o detalle
- THEN MUST construir una galeria ordenada
- AND MUST usar imagen principal como primer elemento
- AND MUST evitar duplicados visuales cuando la imagen principal tambien aparece en la lista

### Requirement: Optimizacion de carga
El sistema MUST optimizar URLs y atributos de imagen segun contexto de uso.

#### Scenario: Cargar catalogo
- GIVEN una propiedad aparece en resultados
- WHEN la tarjeta esta fuera de las primeras posiciones
- THEN sus imagenes SHOULD cargarse de forma diferida
- AND las primeras tarjetas MAY priorizar imagen para mejorar percepcion de velocidad

### Requirement: Resiliencia ante imagenes faltantes
El sistema MUST mostrar placeholders o fondos seguros cuando falten imagenes.

#### Scenario: Imagen ausente
- GIVEN una propiedad no tiene imagen valida
- WHEN se renderiza catalogo, preview de mapa o detalle
- THEN el sistema MUST mostrar un placeholder estable
- AND no MUST romper el layout ni desplazar controles


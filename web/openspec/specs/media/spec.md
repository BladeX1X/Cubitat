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

#### Scenario: Galeria en detalle
- GIVEN una propiedad tiene varias imagenes normalizadas
- WHEN se renderiza detalle
- THEN el sistema MUST mostrar galeria responsive
- AND MUST permitir abrir vista ampliada cuando exista accion de fotos
- AND MUST mantener orden consistente entre desktop y movil

### Requirement: Optimizacion de carga
El sistema MUST optimizar URLs y atributos de imagen segun contexto de uso.

#### Scenario: Cargar catalogo
- GIVEN una propiedad aparece en resultados
- WHEN la tarjeta esta fuera de las primeras posiciones
- THEN sus imagenes SHOULD cargarse de forma diferida
- AND las primeras tarjetas MAY priorizar imagen para mejorar percepcion de velocidad

#### Scenario: Imagen prioritaria en resultados
- GIVEN se renderiza la primera pagina de resultados
- WHEN las primeras tarjetas entran sobre el fold
- THEN el sistema MAY usar carga prioritaria para sus imagenes principales
- AND tarjetas posteriores SHOULD usar lazy loading

### Requirement: Resiliencia ante imagenes faltantes
El sistema MUST mostrar placeholders o fondos seguros cuando falten imagenes.

#### Scenario: Imagen ausente
- GIVEN una propiedad no tiene imagen valida
- WHEN se renderiza catalogo, preview de mapa o detalle
- THEN el sistema MUST mostrar un placeholder estable
- AND no MUST romper el layout ni desplazar controles

#### Scenario: Imagen rota
- GIVEN una URL de imagen falla al cargar
- WHEN se renderiza tarjeta, preview o detalle
- THEN el sistema MUST mantener dimensiones reservadas
- AND SHOULD mostrar fallback visual estable

### Requirement: Validacion de media en publicacion
El sistema MUST validar tipo, cantidad y peso de imagenes antes de subir o persistir.

#### Scenario: Archivo no soportado
- GIVEN un usuario selecciona un archivo que no es imagen valida
- WHEN el flujo de publicacion procesa archivos
- THEN el sistema MUST rechazar ese archivo
- AND MUST mostrar error entendible sin bloquear archivos validos restantes

#### Scenario: Limite de imagenes excedido
- GIVEN el usuario intenta subir mas imagenes que el maximo permitido
- WHEN el sistema procesa la seleccion
- THEN MUST aceptar solo hasta el limite definido
- AND MUST informar cuantas imagenes quedaron fuera

### Requirement: Seguridad de URLs de imagen
El sistema MUST tratar URLs de imagen como datos no confiables hasta normalizarlas.

#### Scenario: URL externa insegura
- GIVEN una propiedad contiene una URL externa malformada o no soportada
- WHEN se normalizan imagenes
- THEN el sistema MUST descartarla o reemplazarla por fallback
- AND MUST evitar inyectar contenido ejecutable desde campos de imagen

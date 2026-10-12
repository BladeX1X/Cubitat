# Módulo de Mapas (Maps)

## Purpose
Visualizar la ubicación de los inmuebles e integrar la búsqueda geográfica interactiva mediante un mapa a pantalla completa.

## Requirements

### Requirement: Ubicación Aproximada en Detalle de Propiedad
El sistema MUST mostrar un mapa estático o interactivo reducido en la ficha de detalle de la propiedad para ubicar el inmueble sin revelar la dirección exacta por motivos de privacidad.

#### Scenario: Visualización del mapa de detalle
- GIVEN un usuario en la página de detalle de una propiedad
- WHEN visualiza la sección de ubicación
- THEN el sistema MUST inicializar un contenedor de MapLibre GL centrado en las coordenadas aproximadas del inmueble
- AND el sistema MUST dibujar un círculo de radio aproximado o un marcador genérico sin indicar la dirección exacta
- AND cuando se dibuje un area aproximada, el radio MUST estar definido en unidades geograficas para mantener la misma region al hacer zoom

#### Scenario: Abrir mapa desde detalle
- GIVEN una propiedad tiene coordenadas disponibles
- WHEN el usuario abre la accion `Mapa` o seccion de ubicacion
- THEN el sistema MUST mostrar un mapa centrado en la ubicacion aproximada
- AND MUST mantener controles accesibles para cerrar o volver al detalle

#### Scenario: Coordenadas faltantes
- GIVEN una propiedad no tiene coordenadas validas
- WHEN se renderiza detalle o mapa
- THEN el sistema MUST mostrar estado alternativo estable
- AND MUST evitar inicializar MapLibre con coordenadas invalidas

### Requirement: Mapa de Búsqueda Grande con Filtros Integrados
El sistema MUST proveer una vista de pantalla dividida o pantalla completa con un mapa interactivo para buscar y filtrar inmuebles directamente desde la interfaz geográfica.

#### Scenario: Exploración de inmuebles en el mapa grande
- GIVEN un usuario en la pestaña o página de mapa grande
- WHEN se cargan las propiedades
- THEN el sistema MUST mostrar pines con el precio abreviado de las propiedades en sus respectivas coordenadas geográficas
- AND al hacer clic en un pin, se desplegará una tarjeta de previsualización flotante con información clave del inmueble
- AND al mover o hacer zoom en el mapa, el sistema MUST filtrar o recargar las propiedades para mostrar solo aquellas dentro del área visible (bounding box) si el modo de búsqueda geográfica está activo
- AND los filtros de búsqueda generales (tipo, operación, precio) MUST actualizar de inmediato los pines del mapa

### Requirement: Adaptador MapLibre aislado
El sistema MUST encapsular la integracion de MapLibre detras de un componente/adaptador para reducir impacto de fallos.

#### Scenario: Carga diferida del mapa
- GIVEN un usuario no abre la vista de mapa
- WHEN se renderizan resultados o detalle
- THEN el modulo pesado de MapLibre SHOULD permanecer diferido cuando sea posible
- AND la lista de resultados MUST cargar sin esperar por el bundle de mapa

#### Scenario: Error al cargar estilo de mapa
- GIVEN falla la descarga del estilo OpenFreeMap
- WHEN el adaptador intenta inicializar el mapa
- THEN el sistema SHOULD registrar el error
- AND MUST evitar romper toda la pagina
- AND SHOULD mostrar fallback o estado de carga/error si el producto lo define

### Requirement: Clusters y pines
El sistema MUST representar muchas propiedades con clusters y pines comprensibles.

#### Scenario: Cluster en mapa
- GIVEN hay varias propiedades cercanas
- WHEN el mapa se renderiza a un nivel de zoom bajo
- THEN el sistema MUST agruparlas en clusters
- AND al pulsar un cluster MUST hacer zoom hacia ese grupo

#### Scenario: Pin de propiedad
- GIVEN una propiedad visible no esta agrupada
- WHEN el mapa la renderiza
- THEN el sistema MUST mostrar un pin o badge con precio o etiqueta relevante
- AND al pulsarlo MUST seleccionar la propiedad sin navegar automaticamente al detalle

### Requirement: Privacidad geografica
El sistema MUST evitar revelar direccion exacta si el producto requiere ubicacion aproximada.

#### Scenario: Coordenadas publicas aproximadas
- GIVEN una propiedad tiene direccion exacta internamente
- WHEN se muestra en mapa publico
- THEN el sistema SHOULD usar coordenadas aproximadas o zona
- AND MUST evitar mostrar calle exacta salvo requisito explicito

### Requirement: Respaldo de pines sincronizado y agrupado
#### Scenario: Las capas del mapa no se pintan
- GIVEN las capas GeoJSON no se pueden pintar y se activa el respaldo de marcadores DOM
- WHEN cambian las propiedades filtradas o el usuario desplaza o acerca el mapa
- THEN el respaldo MUST actualizarse con las propiedades vigentes y retirar pines obsoletos
- AND MUST agrupar propiedades cercanas en pantalla con un conteo accesible
- AND al pulsar un grupo MUST mostrar sus propiedades o acercar el mapa al grupo

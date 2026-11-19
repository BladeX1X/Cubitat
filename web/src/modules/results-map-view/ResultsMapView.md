# ResultsMapView

## Selección de grupos en mapa

La vista móvil conserva en el carrusel todos los IDs recibidos al pulsar un
cluster. MapLibre recibe esos IDs para mantener resaltados los clusters hijos
cuando el grupo se divide con el zoom. Al finalizar un zoom, MapLibre comprueba
si todos los puntos seleccionados siguen dentro del área visible sin cubrir por
el buscador, los controles o el carrusel; si alguno quedó fuera, encuadra el
grupo completo sin superar el nivel de zoom solicitado.

Sin una selección activa, los cambios del viewport continúan filtrando los
resultados visibles como antes. El encuadre no altera filtros ni datos.

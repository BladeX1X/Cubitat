# MarketplaceCardImage

Comparte la carga de miniaturas entre Servicios y Materiales. Las cuadrículas de ambos catálogos deben usar este componente; un `<img>` directo omite sus prioridades y fallback. Optimiza URLs de Unsplash a 420 px/calidad 45, marca las dos primeras tarjetas visibles como eager/high priority, deja el resto lazy/low, decodifica de forma asíncrona y muestra el fallback del catálogo ante error. No reescribe URLs firmadas ni URLs de otros hosts.

# Valoración orientativa Fase 4

## Propósito

Ofrecer una estimación informativa opcional basada en comparables publicados,
sin presentarla como avalúo profesional, asesoría financiera ni oferta.

## Estado de lanzamiento

La valoración es una función futura y permanece deshabilitada en producción.
Solo puede habilitarse en DEV mediante `VITE_PHASE4_VAL_ENABLED=true`; una
publicación del perfil F4 no debe activarla por incluir otros módulos F4.

## Requisitos vigentes

### Estimación y muestra

- **WHEN** una persona autenticada solicita una estimación con muestra suficiente
- **THEN** el resultado presenta fecha, zona agregada, tamaño de muestra y método
- **AND** identifica anuncios publicados sin exponer dirección, propietario o contacto
- **AND** no entrega una cifra con menos de cinco comparables
- La búsqueda limita comparables al mismo tipo y operación, a una coincidencia
  textual de zona y a un área entre 70% y 130% del área indicada.
- La referencia se calcula como mediana del precio publicado por m² multiplicada
  por el área indicada; se muestra la fecha de consulta y una advertencia visible.
- Las estimaciones no se almacenan; no existe historial de valoraciones.

### Privacidad y contrato de datos

- La RPC devuelve solo identificador opaco, área, precio y fecha; excluye
  contacto, identidad del propietario y dirección precisa.
- `get_property_value_comparables` requiere Auth, usa `SECURITY DEFINER` con
  `search_path=pg_catalog`, y solo expone ejecución a `authenticated`.
- Consume `ComparableSource`; no importa repositorios ni consulta tablas
  directamente del catálogo inmobiliario.
- No crea métricas institucionales identificables.

### Independencia

- Opera sin directorio de servicios, reseñas, marketplace o monetización B2B.
- Si la fuente de comparables no está disponible o no alcanza el mínimo,
  comunica que no hay estimación suficiente; no bloquea otros módulos.
- La fórmula de la versión inicial se describe en la interfaz; las consultas
  son efímeras y no respaldan estimaciones históricas.

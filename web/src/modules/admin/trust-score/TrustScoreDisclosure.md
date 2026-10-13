# Indicador interno de confianza

## Responsabilidad

En DEV y en el perfil `phase2-production`, muestra bajo demanda el Trust Score
de una publicación dentro de la tarjeta de moderación. Evita cargar el score
para cada resultado, queda fuera del build productivo estándar y no depende de
que exista una solicitud documental pendiente.

La función `get_property_trust_score` conserva el control de acceso: el
propietario de la ficha o un administrador con AAL2. En esta vista solo se
presenta a administradores que ya pasaron el gate de moderación; RLS/RPC siguen
siendo la autoridad de seguridad.

## Presentación

- Botón plegable para consultar solo la ficha solicitada.
- Muestra el puntaje sobre 100 y los cuatro factores explicables.
- Aclara que es orientativo y no certifica la titularidad.
- Incluye carga, error y reintento sin impedir el resto de acciones de la ficha.
- No se presenta en resultados públicos ni altera el estado de moderación.

## Verificación

`TrustScoreDisclosure.test.tsx` comprueba consulta bajo demanda, factores,
aviso legal, manejo de error y reintento. La matriz SQL local también comprueba
que el RPC calcula los factores y limita la consulta a usuarios autorizados.

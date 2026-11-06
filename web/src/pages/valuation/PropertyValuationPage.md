# PropertyValuationPage

## Responsabilidad

Ofrece una referencia estadística efímera a una persona autenticada. El usuario
indica tipo, operación, zona aproximada y área; la fuente encapsulada consulta
`get_property_value_comparables` y la pantalla presenta mediana, muestra, fecha,
método y límites de interpretación.

## Contrato y privacidad

- La RPC es autenticada; su lista de resultados solo incluye ID opaco, área,
  precio publicado y fecha. No incluye dirección, propietario ni contacto.
- La zona se compara por texto y los comparables deben compartir tipo y
  operación, con un área de 70% a 130% de la indicada.
- No se muestra cifra con menos de cinco comparables.
- Método: mediana de `precio / área` multiplicada por el área ingresada. La
  muestra visible deja claro que los precios originales fueron declarados por
  anunciantes.
- Las consultas y resultados no se persisten.
- El resultado no es avalúo profesional, garantía, asesoría financiera ni oferta.

## Verificación

`modules/valuation/valuation.test.ts` comprueba mínimo de muestra y normalización
por m². El contrato SQL verifica permisos autenticados y proyección minimizada.
La función permanece deshabilitada en producción por decisión de producto. Una
eventual activación requiere revisar respuesta SQL, estados sin muestra y layout
móvil en DEV, además de autorización explícita.

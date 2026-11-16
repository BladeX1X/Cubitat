# MarketplaceContactActions

Acciones compartidas de teléfono y WhatsApp para anuncios de propiedades,
Servicios y Materiales, tanto en tarjetas como en la ficha.

Al pulsar “Contactar” o “Consultar”, la interfaz solicita al Worker el canal
privado del anuncio. El teléfono no aparece en el catálogo ni se descarga antes
de una acción explícita. El Worker valida el tipo e ID, aplica límite por IP y
obtiene los datos mediante RPC privadas: `get_public_property_contact` para
propiedades y `get_public_marketplace_contact` para Servicios y Materiales.

“Contactar” abre `tel:` solo con el teléfono declarado. “Consultar” abre
WhatsApp solo con el número declarado como WhatsApp, precompleta una consulta
con el título y la zona pública del anuncio y no envía el mensaje. No se asume
que el teléfono también está registrado en WhatsApp. Si falta el canal, se
informa cuál y la tarjeta permite abrir el formulario de consulta; los fallos
temporales tienen un mensaje recuperable.

Pruebas: `MarketplaceContactActions.test.tsx` comprueba apertura directa de
teléfono y WhatsApp, canal ausente y fallos recuperables. `marketplaceContact.test.ts`
comprueba que el lookup no se cachea y que los enlaces se validan. El E2E
`PropertyCard.test.tsx` y `DetailPage.test.tsx` comprueban que las propiedades
abran teléfono y WhatsApp mediante la consulta protegida, sin tomar el contacto
del payload público. `marketplace-card-actions.spec.ts` comprueba en Servicios y Materiales el canal
telefónico sin recargar el catálogo ni abrir una pestaña, WhatsApp contextual y
el fallback cuando falta el canal. Las llamadas al Worker y los destinos externos
se simulan; no se inicia ninguna llamada ni se envía un mensaje real. También valida que una persona anónima conserve el texto al abrir el acceso, y que una sesión autenticada envíe el tipo/ID/mensaje esperado, reciba confirmación y limpie el campo. Estos recorridos no escriben consultas reales.

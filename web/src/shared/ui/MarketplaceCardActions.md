# MarketplaceCardActions

Acciones reutilizadas en las tarjetas públicas y fichas de Servicios y
Materiales. “Contactar” consulta el teléfono al Worker y abre el marcador del
dispositivo; “Consultar” usa solamente el número declarado como WhatsApp y abre
WhatsApp con un mensaje que identifica el anuncio y la zona. No se navega antes
a otra ficha y no aparece un diálogo intermedio.
Los datos privados no forman parte de la respuesta del catálogo; solo se
solicitan al pulsar explícitamente una de estas acciones y el Worker limita las
consultas por IP.

La fila usa botones táctiles de ancho completo en móvil y escritorio. Si falta
el canal o falla el servicio, muestra una explicación y permite abrir la ficha
para enviar una consulta por el formulario. Mantener el componente independiente
de los módulos de dominio.

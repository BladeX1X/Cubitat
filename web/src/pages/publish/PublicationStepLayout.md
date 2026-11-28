# PublicationStepLayout

Componente presentacional compartido por los flujos de publicación de Servicios
y Materiales. Recibe las etiquetas/descripciones de los pasos y callbacks de
navegación; los formularios padres conservan la propiedad de campos, validación
HTML del paso activo, persistencia, carga de fotos, errores y envío.

En escritorio presenta el índice lateral y la tarjeta del paso; en móvil el
índice es una fila desplazable. Los pasos futuros no se pueden abrir; los pasos
actuales y anteriores sí. El formulario padre bloquea el avance si falla la
validación nativa del panel activo. El botón final envía el formulario que lo
contiene.

«Continuar» y el botón de envío final son elementos distintos del DOM. Avanzar
al último paso no debe enviar el formulario; solo el clic explícito en el botón
de envío puede publicarlo.

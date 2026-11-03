# Validación de documentos de postulación de agentes

`agent-applications.ts` contiene la validación sin efectos secundarios que debe
ejecutarse en el Worker antes de guardar documentos de una postulación. Deriva
PDF, JPEG o PNG a partir de los bytes y no confía en el nombre ni el MIME que
envía el navegador. El tamaño máximo es inclusivo: 10 MiB exactos se aceptan y
cualquier byte adicional se rechaza.

Esta validación todavía no implementa carga a Storage, persistencia de la
postulación, revisión administrativa, correo ni eliminación programada. Esos
controles siguen siendo necesarios antes de habilitar el flujo de Fase 3.

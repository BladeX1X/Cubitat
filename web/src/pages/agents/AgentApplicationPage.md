# Postulación de agentes

## Responsabilidad

`AgentApplicationPage` captura en cliente provincia principal, título de nivel
superior, experiencia opcional y dos documentos. Envía multipart al Worker
`/api/phase3/agent-applications` con la sesión Supabase del usuario y nunca
envía documentos a Supabase desde el navegador.

## Seguridad y activación

- La ruta `/postular-agente` requiere sesión; el login devuelve a la ruta
  pendiente después de autenticarse.
- La navegación y el chunk solo se habilitan cuando el build `phase2-dev`
  define `VITE_PHASE3_UI_ENABLED=true`.
- El Worker valida la identidad, limita frecuencia/tamaño, inspecciona firmas
  reales, sube al bucket privado y persiste con una RPC reservada al service role.
- Esta pantalla es solo de pruebas mientras no estén activos la revisión AAL2,
  la notificación de correo y la purga 30 días después de la decisión. El aviso
  visible impide presentar esos controles como ya disponibles.

## Accesibilidad y estados

Los campos tienen etiquetas explícitas; tamaño, campos faltantes y errores del
servidor presentan mensajes claros sin mostrar detalles internos. El éxito
confirma recepción en estado pendiente, pero aclara que aún no se envía correo.
La página adapta el formulario a una columna en móvil.

## Verificación

`AgentApplicationPage.test.tsx` cubre requeridos, envío autenticado multipart,
respuesta exitosa, endpoint apagado y archivo superior a 10 MB.

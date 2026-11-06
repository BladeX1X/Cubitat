# Postulación de agentes

## Responsabilidad

`AgentApplicationPage` captura en cliente provincia principal, título de nivel
superior, experiencia opcional y dos documentos. Envía multipart al Worker
`/api/phase3/agent-applications` con la sesión Supabase del usuario y nunca
envía documentos a Supabase desde el navegador.

## Seguridad y activación

- La ruta `/postular-agente` requiere sesión; el login devuelve a la ruta
  pendiente después de autenticarse.
- La acción «Ser agente» de Mi cuenta navega a esta ruta solo cuando Fase 3 está
  habilitada; los perfiles que ya tienen rol de agente conservan el acceso al
  panel y no ven la acción de postulación.
- La navegación y el chunk se habilitan en DEV cuando
  `VITE_PHASE3_UI_ENABLED=true`, o en el perfil explícito `phase3-production`.
- El Worker valida la identidad, limita frecuencia/tamaño, inspecciona firmas
  reales, sube al bucket privado y persiste con una RPC reservada al service role.
- Producción ya tiene la pantalla y el endpoint desplegados con
  `PHASE3_ENABLED=true`; el QA autenticado positivo de envío todavía está
  pendiente. Por eso el formulario solicita usar documentos sintéticos.

## Accesibilidad y estados

Los campos tienen etiquetas explícitas; tamaño, campos faltantes y errores del
servidor presentan mensajes claros sin mostrar detalles internos. Un conflicto
por solicitud abierta se muestra como tal. El éxito confirma recepción en estado
pendiente, no aprobación ni entrega efectiva del correo.
La página adapta el formulario a una columna en móvil.

## Verificación

`AgentApplicationPage.test.tsx` cubre requeridos, envío autenticado multipart,
respuesta exitosa, endpoint apagado y archivo superior a 10 MB.

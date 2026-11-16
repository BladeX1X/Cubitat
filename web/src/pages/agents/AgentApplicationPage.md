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
  `VITE_PHASE3_UI_ENABLED=true` con `phase2-dev`, o en el perfil combinado
  `phase34-dev`; producción usa `phase3-production` o `phase4-production`.
- El Worker valida la identidad, limita frecuencia/tamaño, inspecciona firmas
  reales, sube al bucket privado y persiste con una RPC reservada al service role.
- Producción ya tiene la pantalla y el endpoint desplegados con
  `PHASE3_ENABLED=true`; el QA autenticado positivo de envío todavía está
  pendiente. Por eso el formulario solicita usar documentos sintéticos.

## Accesibilidad y estados

Los campos tienen etiquetas explícitas; tamaño, campos faltantes y errores del
servidor presentan mensajes claros sin mostrar detalles internos. Los fallos 503
usan códigos seguros para distinguir problemas al guardar documentos privados
de problemas al registrar la solicitud; los detalles de Storage/PostgREST nunca
se muestran. Un conflicto por solicitud abierta se muestra como tal. El éxito confirma recepción en estado
pendiente, no aprobación ni entrega efectiva del correo.
La página adapta el formulario a una columna en móvil.

## Verificación

`AgentApplicationPage.test.tsx` cubre requeridos, envío autenticado multipart,
respuesta exitosa, endpoint apagado, errores seguros por etapa y archivo
superior a 10 MB.

El Worker normaliza el `signedURL` relativo que devuelve Storage REST antes de
entregar enlaces efímeros al panel administrativo o al correo. La respuesta se
limita al origen configurado, al bucket privado de postulaciones y a URLs con
token. Las pruebas de `agent-application-documents.test.ts` y
`agent-application-email-dispatcher.test.ts` cubren la forma documentada
`/object/sign/...`.

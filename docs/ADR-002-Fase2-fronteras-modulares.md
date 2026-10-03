# ADR-002: Fronteras modulares de Fase 2

- **Estado:** aceptado para la rama DEV; pendiente de promoción a producción.
- **Fecha:** 2026-09-28.
- **Alcance:** módulos exclusivos de Fase 2 en el Worker y la aplicación web.

## Contexto

Fase 2 añade moderación IA, Push, KYC, verificación de propiedades,
notificaciones por correo, métricas y capacidades administrativas. El Worker
también conserva rutas públicas y de autenticación de Fase 1. Una modificación
en un carril no debe cambiar accidentalmente los contratos de los demás ni
introducir módulos de Fase 2 en el bundle productivo.

## Decisión

1. El Worker central conserva únicamente el enrutamiento, autenticación,
   límites y composición de respuestas.
2. La lógica de dominio se mantiene en módulos independientes:
   `worker/ai-moderation.ts`, `worker/push-notifications.ts`,
   `worker/public-submissions.ts`, `worker/alert-email-dispatcher.ts` y
   `worker/kyc-evidence-retention.ts`.
3. Cada módulo recibe un entorno tipado y dependencias inyectables cuando hace
   llamadas externas; no lee secretos desde el cliente.
4. La moderación sin proveedor disponible degrada a revisión manual y no
   bloquea la publicación ni transforma un fallo externo en aprobación.
5. Los builds productivo y DEV se verifican con contratos opuestos: producción
   excluye módulos exclusivos de Fase 2 y DEV los incluye.
6. Toda promoción se mantiene manual hasta completar QA autenticado, pruebas
   de proveedores externos y validación física de Push.

## Consecuencias

- Los cambios de un módulo pueden probarse y revertirse sin editar todos los
  carriles del Worker.
- La complejidad del router central sigue siendo deuda técnica conocida; no se
  extraerá por volumen sin una especificación y una suite de regresión propia.
- Los guards de build bloquean fugas de módulos exclusivos y secretos privados.
- La ausencia de `GROQ_API_KEY`, OAuth/CAPTCHA/Resend Auth o dispositivos reales
  mantiene esos carriles pendientes, sin impedir el avance de los demás.

## Retención y alertas productivas

- La evidencia KYC se retiene 24 horas después de aprobar o rechazar la
  solicitud y luego se elimina mediante el Worker con `service_role`.
- Las alertas de búsqueda se entregan por Resend desde una cola idempotente;
  requieren `RESEND_API_KEY`, `ALERT_EMAIL_FROM` y `PUBLIC_SITE_URL` en el
  entorno correspondiente.
- La retención de auditoría de Auth permanece separada en 90 días y no se
  activa por este módulo.

## Evidencia actual

- Suite completa: 136 archivos y 600 pruebas correctas.
- Moderación IA: 53/53 pruebas correctas después de extraer el módulo.
- Build productivo: excluye Fase 2 y secretos privados.
- Build DEV: incluye KYC, configuración DEV y secretos privados ausentes del
  artefacto compilado.

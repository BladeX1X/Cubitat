# Entrada pendiente para el vault de Cubitat

Fecha: 2026-09-28

Esta entrada está preparada para añadirse al final de `Cubitat - Checklist de
Lanzamiento.md` y `Cubitat - Dashboard del Proyecto.md` cuando el vault permita
escritura. No contiene secretos ni sustituye el historial existente.

- [x] Gates revalidados: lint correcto, 136 archivos/600 pruebas, build
  productivo aislado correcto y build `phase2-dev` correcto con KYC y 446 URLs.
- [x] Supabase DEV: `db lint` sin errores y `db push --dry-run` actualizado;
  sin migraciones ni datos escritos.
- [x] Auditoría E2E pública DEV: `comprehensive-audit.spec.ts`, 1/1 en
  Chromium, sin credenciales ni escrituras persistentes.
- [x] E2E público y seguridad DEV: auditoría, búsqueda, Turnstile y los
  escenarios seleccionados pasaron 6/6 en Chromium con conectividad autorizada.
  La ejecución previa falló por `ERR_NETWORK_ACCESS_DENIED`/`EACCES` del
  entorno local, no por una respuesta errónea del Worker.
- [x] Preparación E2E autenticada: el flujo real ya acepta
  `CUBITAT_E2E_BASE_URL` y guarda capturas en artefactos Playwright; mantiene
  las barreras de credenciales QA y mutaciones explícitamente autorizadas.
- [x] Revalidación remota: DEV conserva el 100% del tráfico en la versión
  operativa `97259d81-46cd-42e9-a2d0-4784390d458b`; sus rutas críticas
  respondieron 200 y la auditoría pública posterior pasó 6/6. Producción
  permaneció aislada.
- [ ] Revisión externa pendiente: `GROQ_API_KEY`, CAPTCHA, Resend Auth y OAuth
  Google Auth siguen ausentes; solo se inspeccionaron nombres de secretos y no
  se modificó ningún valor.
- [ ] Auditoría React Doctor: los avisos RLS apuntan a migraciones iniciales
  reemplazadas por endurecimientos posteriores; falta confirmarlo contra el
  esquema remoto, por lo que no se marca como cerrado.
- [x] KYC: las previews temporales liberan URLs al reemplazar archivos,
  limpiar o desmontar; se añadieron pruebas y la suite quedó en 136/600.
- [ ] SQL/RLS pendiente: Docker continúa ausente; el dry-run de `pg_dump` no
  generó dump ni cambios remotos.
- [x] Rendimiento menor: formateadores `Intl` de auditoría y permutas se
  reutilizan por módulo; gates 136/600 correctos y sin despliegue necesario.
- [x] Rate limiter: limpieza concurrente y normalización de parámetros
  inválidos; prueba añadida y despliegue DEV verificado.
- [x] `CubitatApp`: las actualizaciones posteriores a la lectura de caché están
  protegidas por el estado activo del efecto.
- [x] Worker DEV: `wrangler check startup` correcto, ventana local de 20.6 ms.
- [ ] Configuración externa pendiente: CAPTCHA, Resend y OAuth Google.
- [ ] Configuración externa pendiente: `GROQ_API_KEY` para moderación IA real.
- [ ] QA físico pendiente: Push/PWA con aplicación cerrada en Android e iOS.
- [ ] Flujos autenticados y escrituras reales pendientes: requieren cuentas QA
  autorizadas, proveedor externo disponible y limpieza verificable.
- [x] Producción permanece intacta.
- [x] CI mantiene automatizados instalación limpia, auditoría de dependencias,
  lint, suite completa y builds productivo/DEV; los E2E autenticados quedan
  fuera de CI por requerir cuentas QA y proveedores externos.

## Evidencia de bloqueo

El intento de actualizar directamente el vault devolvió `Acceso denegado`.
Esta nota mantiene el contenido listo para una futura sincronización sin
forzar permisos ni modificar archivos fuera del repositorio.

## Revalidación posterior de moderación IA - 2026-09-28

- [x] `GROQ_API_KEY` configurada en el Worker Phase 2 DEV y verificada con una
  reevaluación real desde `/moderar`.
- [x] El anuncio QA `Departamento en venta en Playa` fue usado como fixture;
  Groq devolvió `ai_rejected`, mostró un motivo coherente y la tarjeta se
  actualizó sin recargar.
- [x] El anuncio fue restaurado a `published`; producción no se modificó.
- [ ] Siguen pendientes KYC persistente y Push físico Android/iOS.

## Prueba KYC sintética DEV - 2026-09-28

- Se crearon los fixtures locales `tmp/kyc-qa/qa-document.png` y
  `tmp/kyc-qa/qa-selfie.png`, ambos identificados como `QA - NO VALIDO`.
- La solicitud se envió desde DEV, apareció en moderación KYC y fue rechazada
  con motivo de prueba.
- Evidencia final: moderación sin solicitudes pendientes y cuenta con estado
  `Solicitud Rechazada`; producción permanece intacta.

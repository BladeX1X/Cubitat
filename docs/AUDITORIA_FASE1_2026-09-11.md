# Auditoría Fase 1 — 2026-09-11

> **Actualización posterior — 2026-09-14:** los seis hallazgos técnicos de esta
> auditoría fueron corregidos, cubiertos por pruebas y desplegados. Las
> migraciones productivas 55 a 59 están sincronizadas y el Worker activo es
> `14a5dd39-9f47-4077-bed4-ef916c2bd24b`. La puerta vigente pasa lint, 111
> archivos/460 pruebas y build PWA. Aún faltan integrar el lote en `main`, los
> QA físicos/autenticados indicados al final y la aprobación de contenido/legal.
> El texto inferior se conserva como fotografía histórica del 2026-09-11.

Estado: revisión concluida con hallazgos; Fase 1 no cerrada. No se implementaron correcciones ni se desplegó. Base: HEAD `3c02193`, rama `feature/web-push-notifications`, incluyendo cambios locales preexistentes de Push/PWA.

## Validación actual

- `npm run lint`: aprobado.
- `npm run test:run`: 103 archivos, 425 pruebas aprobadas.
- `npm run build`: aprobado; PWA con 42 entradas/1040.32 KiB, 473 URLs de sitemap y aislamiento de Fase 2 aprobado en frontend y Worker.
- Advertencias: MapLibre 1027.60 kB minificado (272.93 kB gzip); opción `inlineDynamicImports` obsoleta.
- Navegador productivo: portada, selector con 16 provincias/municipio especial, búsqueda La Habana (13 resultados), recarga de resultados, cuenta y menú móvil 390×844 observados. Menú sin superposición; ancho de documento 375 frente a viewport 390. Push visible en cuenta, sin activar permisos.
- No se repitieron envíos, altas, cambios de contraseña, moderación real, matriz SQL remota ni recepción Push física. La evidencia histórica del vault no sustituye esas comprobaciones actuales. El navegador dejó de estar disponible al intentar restaurar el viewport.

## Hallazgos prioritarios

### P1 — Suscripción Push sin aislamiento al cambiar de cuenta

`web/src/modules/notifications/push/pushService.ts:113` consulta únicamente `pushManager.getSubscription()`. `PushNotificationSettings.tsx:44` interpreta cualquier suscripción como activa sin verificar titular en servidor. El cierre de sesión de `CubitatApp.tsx` no desasocia Push. En un navegador compartido, A puede seguir recibiendo avisos después de salir; B puede ver el estado activo aunque la asociación siga siendo de A. Confirmado por revisión de código; no se enviaron notificaciones reales. Cierre: prueba A → logout → B, sin entrega de A ni falso estado activo para B.

### P1 — Cola Push puede conservar notificaciones del titular anterior

`web/src/worker/push-notifications.ts:112` hace upsert por endpoint y cambia `user_id`, conservando el identificador de suscripción. `web/supabase/migrations/20260911030000_fix_push_claim_bound.sql` une entregas, suscripciones y notificaciones sin exigir igualdad entre sus propietarios. Una entrega pendiente de A puede procesarse después de reasignar el endpoint a B. Cierre: invalidar entregas antiguas y verificar pertenencia al reclamar y enviar, con prueba de reasignación y concurrencia.

### P1 — RPC antigua de moderación no exige AAL2

`web/supabase/migrations/20260708000000_restrict_ai_moderation_statuses.sql:76` concede EXECUTE a authenticated. La última definición de `set_property_ai_moderation` en `20260709000000_security_harden_profiles_moderation.sql:60` es SECURITY DEFINER y comprueba rol admin, pero no AAL2. La migración posterior de MFA no revoca esta RPC antigua. El trigger de owner_hidden protege ese estado particular, pero no todas las propiedades. Riesgo estático: admin AAL1 puede cambiar estados de anuncios ajenos mediante la API directa de Supabase. No se intentó explotar en producción. Cierre: retirar RPC obsoleta o exigir AAL2 y probar admin AAL1/AAL2 contra la cadena completa.

### P1 — Fallo de subida permite guardar sin todas las fotos

`web/src/pages/publish/PublishPage.tsx:610` registra el error y continúa. Líneas 694–695 guardan solo las imágenes exitosas; líneas 757–758 muestran éxito y eliminan borrador. Si Storage devuelve error, el anuncio puede terminar sin fotos o incompleto. Cierre: no confirmar publicación parcial sin una decisión explícita, conservar borrador e imágenes y probar fallo parcial/total y reintento.

### P2 — Borradores sin autoguardado ni imágenes

La única llamada a `savePublicationDraft` está en el botón manual (`PublishPage.tsx:465`) y recibe `formData`, sin `images`. Restaurar depende de `load_draft=true`. No satisface el autoguardado y recuperación descritos por la Fase 1. Cierre: recargar/cerrar durante edición y recuperar datos, paso y fotos aislados por usuario.

### P2 — Dirección exacta incluida en ubicación pública

`PublishPage.tsx:484` concatena `streetAddress` en `location`; línea 680 la persiste. `DetailPage.tsx:420` y 526 muestran ese campo completo, mientras la ficha anuncia ubicación aproximada protegida. La protección del mapa no oculta el texto de calle/número. Cierre: separar dirección privada de zona pública y verificar detalle, metadatos y respuesta pública con una dirección sintética.

## Cobertura y pendientes de cierre

| Área | Resultado de esta revisión |
|---|---|
| Inicio, búsqueda, filtros, listado | Implementados; recorrido productivo por provincia verificado. Escalabilidad y todos los filtros no revalidados en vivo. |
| Detalle, mapa, compartir | Código revisado; pendiente corregir exposición de dirección y repetir recorrido completo en móvil físico. |
| Publicación, edición, imágenes, borradores | Implementados con fallos de pérdida de fotos y recuperación descritos arriba. |
| Auth, perfil, favoritos | Suite aprobada; cuenta productiva observada. Alta/login/recovery completo consta históricamente, no repetido hoy. |
| Moderación, RLS, contactos | Controles presentes y tests aprobados; RPC antigua requiere remediación y nueva matriz real. Contactos no enviados hoy. |
| Notificaciones y PWA | Build aprobado y UI productiva presente; aislamiento entre cuentas y recepción/clic en Android/iOS pendientes. |
| SEO y despliegue | Sitemap y aislamiento de bundle aprobados. Search Console y configuración remota completa no revalidados hoy. |
| Operación y contenido | Checklist mantiene inventario/fotos/datos reales aprobados y revisión jurídica pendientes. |

La documentación operativa necesita reconciliación: guía de despliegue conserva SQL manual que permite INSERT público de contactos, contrario al flujo vigente con Turnstile; también conserva instrucciones de push directo a main. El dashboard y handoff mezclan referencias de julio con avances de septiembre. La checklist mantiene rotación de Groq pendiente y renovación histórica del token de métricas, cuyo estado actual no se comprobó.

Orden de cierre: aislamiento Push y RPC MFA; integridad de fotos y borradores; dirección pública; QA real por roles y dispositivos; reconciliación documental, inventario y aprobación jurídica. Las 425 pruebas aprobadas no cubren por sí solas estos escenarios.

# Checklist de QA y cierre — Fases 3 y 4

Fecha de corte: 2026-11-06
Entorno de trabajo: rama aislada `bugfix/phase34-local-closeout`
Estado: lista de trabajo; no es una certificación de cierre.

## Estado de despliegue conocido

- [x] Fase 3 publicada en producción (`cubitat1`, versión `37c5b4f8-20f7-4b71-99f6-06957343100d`, según handoff del 2026-11-04). El despliegue no incluyó QA funcional autenticado.
- [x] Fase 4 publicada en producción; servicios, reseñas, materiales y beneficios están en el perfil activo. La función **Valorar** queda fuera por decisión del producto.
- [x] F3 y F4 publicadas en DEV el 2026-11-06 en `cubitat1-phase2-dev`, versión `239a948a-2947-4782-a346-de1f46ccbdb0`. Se comprobaron rutas HTTP 200, que solo acredita que la app sirve las páginas.
- [x] Release DEV actualizado a `394ef3fb-d21e-4579-905e-2246a15ca995`: mantiene F3 y las banderas UI de Servicios/Reseñas/Materiales/Beneficios, deja Valorar apagado, incluye aviso de foto Materiales no disponible y normaliza las URLs firmadas de CV/título.
- [x] Retiro administrativo de agentes publicado en DEV el 2026-11-07, Worker `cubitat1-phase2-dev`, versión `36f2fa5f-95c1-4a9c-8b3f-1ae8a0154ec8`. La consulta remota confirmó tabla de auditoría y dos RPC. Confirmar el registro de la versión `20261106100000` en el historial remoto.
- [x] Estado real de postulación en Mi cuenta verificado en captura del usuario: “Postulación no aprobada” y CTA “Volver a postularme”.
- [x] Smoke HTTP post-release de home, Mi cuenta, Servicios, Materiales y SEO: 200; assets de estado y módulos F4: 200.
- [x] Gates locales del arreglo actual: lint, suite y build pasan; el detalle está en `docs/MULTI_AGENT_HANDOFF.md`.
- [ ] El diagnóstico seguro del envío de postulaciones continúa local. El aviso de fotos Materiales ya está publicado en DEV. La normalización de enlaces privados de documentos ya está publicada en DEV, y el usuario confirmó apertura del CV y el título con sesión admin AAL2 en DEV; falta comprobar expiración.

## Orden recomendado de pruebas

### Historial privado de motivos de rechazo — DEV — 2026-11-08

- [x] Implementación local: Postulaciones en Moderación incluye historial paginado de rechazos y muestra la nota como interna.
- [x] Pruebas locales de componente, lint, suite completa y build estándar: PASS (196 archivos; 882 aprobadas, 1 omitida).
- [x] Regresión de Mi cuenta: la prueba incluye deliberadamente una nota interna en el objeto de respuesta y confirma que el solicitante solo ve el estado (882 pruebas aprobadas).
- [ ] Ejecutar `build:phase34-dev` con variables públicas del proyecto Supabase DEV y publicar únicamente en el Worker DEV.
- [ ] Con AAL2, verificar que Moderación carga la nota y, con la cuenta solicitante, verificar que no aparece. Usar solo datos sintéticos.

El build estándar pasó, pero no sustituye `build:phase34-dev`. Aún no se desplegó este cambio ni se hizo la comprobación autenticada. Usar únicamente la configuración pública del proyecto DEV; no reutilizar una clave de producción.

### 1. F3 — postulación de agente en DEV

- [x] En **Mi cuenta**, la captura autenticada confirma “Postulación no aprobada” y “Volver a postularme”; el motivo interno no se presenta al postulante. Falta cubrir otros estados y el error de consulta con reintento.
- [ ] Usar una cuenta de QA autorizada y documentos sintéticos; completar todos los campos y enviar una postulación.
- [ ] Si el envío falla, registrar hora, ruta y código seguro mostrado (`document_storage_unavailable`, `application_persistence_unavailable` u otro estado documentado). Consultar logs por etapa/HTTP sin copiar datos personales, rutas de documentos ni secretos.
- [ ] Corregir la causa concreta del fallo y repetir el envío hasta que haya una sola solicitud persistida, sin duplicados por reintento.
- [x] Abrir el CV y el título desde Moderación con sesión admin AAL2; el usuario confirmó que ambos abrieron en DEV el 2026-11-06. La expiración del enlace aún no está comprobada.
- [x] Corregir y desplegar a DEV la interpretación del `signedURL` de Storage (`/object/sign/...`) que Cubitat rechazaba al exigir `/storage/v1/object/sign/...`; pruebas de Worker para documentos y correo pasan (12/12 focales). El usuario confirmó que el CV/título abrieron en DEV el 2026-11-06; queda por comprobar la expiración.
- [x] Rechazo de la postulación QA actual confirmado por el usuario en DEV; el usuario reporta que solo queda probar aprobación. El paso «Iniciar revisión» y la apertura del CV/título también fueron confirmados. No se conserva evidencia de lectura de contenido documental.
- [ ] Aprobar una postulación sintética con KYC verificado y cupo disponible; confirmar rol agente, plaza, historial/bitácora y estado en Mi cuenta. No aprobar una cuenta real por conveniencia.
- [ ] Verificar el límite de cuatro agentes con datos sintéticos; el resultado de lista de espera aún no está evidenciado en este registro.
- [ ] Retiro de agentes: UI y migración publicadas en DEV; probar como admin AAL2 con un agente sintético, verificar que se conservan cuenta y anuncios, que se libera la plaza y que queda evento de auditoría. Confirmar además el registro de `20261106100000` en el historial remoto.
- [ ] Probar el caso de precondición fallida (KYC/AAL2/cupo) y confirmar que se muestra una explicación segura y la solicitud queda en un estado coherente.
- [ ] Confirmar que el panel de agente aparece para la cuenta aprobada, que la cuenta admin que postuló conserva sus permisos admin y que el distintivo KYC se ve en el avatar sin ocupar una tarjeta grande innecesaria.

### 2. F3 — correo, privacidad y retención

- [ ] Confirmar recepción del correo de decisión en el destino provisional `pochiprats18@gmail.com`, revisando también spam y logs del proveedor. No enviar documentos reales.
- [ ] Verificar estados de outbox: reclamado, enviado, reintento y fallo; asegurar que un reintento no mande duplicados.
- [ ] Confirmar en DEV la purga programada de CV/título **30 días después de la decisión**, con filas de QA vencidas/sintéticas; comprobar resultado en Storage y estado de purga sin abrir/copiar documentos.
- [ ] Confirmar que el bucket sigue privado, que una sesión no autorizada recibe 401/403 y que ningún log o mensaje revela URL firmada, ruta o contenido del archivo.
- [ ] Revisar visualmente los mensajes de error de postulación después de desplegar el diagnóstico local a DEV.

### 3. F3 — negocio todavía provisional

- [ ] Documentar la matriz provisional de prestaciones gratis/de pago y dejar claro que no cobra ni bloquea automáticamente.
- [ ] Revisar atribución de referidos al alta y al agente en una prueba sintética; documentar duplicados, autorreferidos y ausencia de código.
- [ ] Mantener pagos, suscripciones y ledger recurrente de comisiones como pendientes de definición e implementación; no activar cobros ni presentar ingresos como liquidados.

### 4. F4 — publicaciones y moderación de Servicios/Materiales

- [ ] Con cuenta QA, publicar un servicio sintético y un material sintético con fotos no sensibles; confirmar validación de campos, subida privada y estado pendiente.
- [ ] Revisar cada anuncio como moderador, aprobar/rechazarlo y verificar qué aparece en el directorio público.
- [ ] Editar y volver a guardar un anuncio propio; comprobar permisos, persistencia y que el usuario no pueda editar anuncios ajenos.
- [ ] Probar estados de disponibilidad de Materiales (disponible, limitada, por encargo y agotado) y que los agotados no aparezcan en resultados públicos.
- [x] Desplegado a DEV el arreglo `photoUnavailable`; el chunk publicado contiene el aviso accesible.
- [ ] Simular/observar en DEV un fallo al firmar una foto y confirmar visualmente que la ficha permanece visible con el aviso. La presencia del chunk por sí sola no cierra el punto.
- [ ] Probar permisos de Storage: privado por defecto, lectura firmada solo para publicaciones permitidas, rechazo de rutas no asociadas y límites de tamaño/cantidad de archivos.

### 5. F4 — búsqueda, filtros y paginación

- [ ] En Servicios, probar búsqueda por texto, categoría, provincia, municipio, selección inmediata del filtro, paginación y total exacto.
- [ ] En Materiales, probar texto, categoría, provincia, disponibilidad, paginación y total exacto.
- [ ] Contrastar un filtro con cero, una y varias páginas; comprobar que cambiar el filtro reinicia la página y que el conteo coincide con las fichas.
- [ ] Dejar el filtro municipal de Materiales pendiente hasta reconciliar/aplicar una migración de ubicación y conectar alta/edición. No mostrar un filtro que no corresponda a datos reales.
- [ ] Reproducir con sesión autenticada el error histórico de favoritos de Servicios (`UNHANDLED_EXCEPTION`); guardar y quitar favorito, recargar y comprobar persistencia. Si reaparece, conservar código/etapa/HTTP sanitizados para localizar la causa.

### 6. F4 — reseñas, contacto y beneficios

- [ ] En una ficha de Servicio y otra de Material, abrir **Escribir reseña** y confirmar que el diálogo se adapta a móvil, cierra correctamente y valida puntuación/texto.
- [ ] Enviar reseña sintética, comprobar persistencia, estado de moderación y lectura pública solo cuando corresponda; probar que un usuario no autenticado no pueda escribir.
- [ ] Probar contacto desde ficha de servicio/material con datos sintéticos; verificar éxito, error, límites antiabuso y que no se expongan teléfono/WhatsApp de otro usuario.
- [ ] Revisar Beneficios como catálogo informativo: sin cargos, checkout ni bloqueos automáticos hasta definir reglas comerciales.
- [x] Mantener **Valorar** fuera de alcance inmediato, según decisión del usuario; no activarlo en producción durante este QA.

### 7. Responsive y regresión de navegación

- [ ] Recorrer páginas públicas y autenticadas de F3/F4 a 320, 390, 768 y 1024 px con contenido real de QA: header/menú, publicación, filtros, tarjetas, diálogos, moderación y panel de agente.
- [ ] Resolver el desplazamiento horizontal observado en `/mis-propiedades` a 320 px en DEV.
- [ ] Verificar teclado, foco, contraste, etiquetas accesibles y ausencia de errores de consola en formularios y diálogos.
- [ ] Probar instalación/actualización PWA en un dispositivo móvil real y confirmar que no conserva una versión antigua del shell.

### 8. Promoción y evidencia

- [ ] Por cada arreglo: reproducir en DEV, corregir, ejecutar `npm run lint`, `npm run test:run` y `npm run build`; actualizar spec y documentación del módulo.
- [ ] Anotar para cada punto: entorno, versión Worker/commit, fecha, pasos, resultado y evidencia sin datos personales.
- [ ] Repetir en producción solo los flujos aprobados y con datos de prueba controlados; no considerar un HTTP 200 o un build local como QA funcional.
- [ ] Antes de cambios de base, confirmar proyecto/entorno, comparar ledger y catálogo, revisar migración exacta, RLS/grants/Storage y obtener autorización explícita para producción.
- [ ] Conservar la bandera `PHASE3_ENABLED=true` explícita en publicaciones F3 de DEV/producción; la configuración DEV en JSONC conserva `false` y requiere override deliberado.
- [ ] Reconciliar por separado las migraciones F2 pendientes de DEV; no ejecutar `db push` global ni `migration repair` para resolver esta checklist.

## Regla de cierre

Marcar una casilla solo después de observar el resultado en el entorno indicado. Si requiere cambio, dejarla abierta hasta que la corrección esté desplegada en DEV y la prueba de regresión haya pasado. La Fase 3 y la Fase 4 no se consideran cerradas por el mero despliegue de rutas o por los gates locales.


## Navegación lateral de Mi cuenta — DEV — 2026-11-06

- [x] Se corrigió el menú oculto bajo lg: navegación lateral desde md y barra horizontal compacta por debajo.
- [x] Prueba de componente: destinos compactos visibles y selección de Favoritos ejecuta navegación.
- [x] Lint, suite y builds DEV/productivo pasan; Worker DEV versión 6dda33ad-0bde-4557-8bb7-3ca991c48370; /mi-cuenta y bundle nuevo responden 200.
- [ ] Confirmar visualmente en una ventana estrecha o zoom reducido que se ve la barra y permite acceder a los destinos. Producción intacta.


### Corrección del bundle publicado en DEV — 2026-11-06
- La versión 6dda33ad-0bde-4557-8bb7-3ca991c48370 fue reemplazada: se había desplegado el dist productivo y faltaban módulos F3.
- Versión vigente 24e554d3-e2d4-4808-bcf1-b321ab0ad39d, recompilada con uild:phase2-dev; Mi cuenta, Postulación, Servicios y Materiales dan 200 y el entrypoint referencia sus chunks.
- Producción/Supabase intactos. Recargar DEV con Ctrl+F5 o refrescar caché PWA si se ve la versión anterior.

# Revisión del checklist Cubitat — 2026-11-07

## Alcance y método

Se contrastó el tramo operativo más reciente de `Cubitat - Checklist de Lanzamiento.md`, el checklist QA F3/F4 y las evidencias disponibles en `origin/main`, GitHub Actions, la configuración versionada de Workers y respuestas HTTP públicas. El checklist de Obsidian contiene más de diez mil líneas y snapshots históricos: sus casillas abiertas antiguas no se contaron como tareas vigentes sin contrastar fecha y evidencia. No se modificaron datos alojados ni se ejecutaron migraciones.

## Aclaraciones que ya pueden considerarse cerradas

| Tema | Estado observado al 2026-11-07 | Evidencia |
|---|---|---|
| Build de `main` en producción | Verificado para el código en `9a176e1`; Worker `cubitat1` versión `23f40b8f-3eae-4032-9d6b-7b01d456862a` al 100%. El commit `4c94a76` posterior solo añadió documentación y su CI terminó con éxito. | PR #225 fusionada; CI `42399435713` success; `docs/PRODUCCION_BUILD_PARITY_2026-11-07.md`. |
| F3 en producción | Las migraciones F3 aprobadas pasaron por workflow controlado `42364846320`; el Worker productivo desplegado sirve el bundle combinado F3/F4. | Checklist de Obsidian, sección «Fase 3 producción — 2026-11-07». |
| F4 en producción | Servicios, reseñas, materiales y beneficios siguen en el perfil publicado. Filtros/paginación ya se desplegaron; el bloqueo histórico de despliegue de filtros queda superado. Valoración continúa aplazada por decisión del usuario. | Secciones de producción F4 en la checklist; PR #212 y #213; smoke de rutas y sitemap. |
| Rutas/assets públicos | La disponibilidad HTTP y los assets principales del build publicado tuvieron respuesta 200. Esto solo confirma disponibilidad, no todos los flujos de usuario. | Nota de paridad de producción y checklist del 2026-11-07. |
| UI DEV de agentes activos | La corrección de allowlist se publicó en Worker DEV `bc22cfbc-8824-4c9a-82a0-b4dfa4333256`; no debe confundirse con prueba de listar o revocar agentes. | Registro DEV del 2026-11-07. |

## Pendientes vigentes y criterio observable de cierre

### Fase 1 y 2

- **QA real responsive/PWA:** faltan recorridos visuales y táctiles en contenido real, rutas autenticadas y dispositivo móvil. Cerrar guardando matriz de viewport/ruta, evidencia sin datos personales, consola limpia y resultado de navegación/teclado. El barrido sintético previo no cierra este punto.
- **Cobertura pHash de producción:** la evidencia reciente localizada es de DEV; no encontré una medición productiva actual comparable. Cerrar con consulta agregada de solo lectura de imágenes elegibles frente a imágenes hasheadas, excluyendo explícitamente fuentes externas/no procesables; no hacer backfill ni alterar anuncios para medir.
- **Historial y esquema Supabase DEV:** sigue la reconciliación separada de las migraciones F2/F3. La existencia de objetos no equivale a ledger reconciliado. No ejecutar `db push` ni `migration repair` global.
- **Trust Score/lecturas específicas:** conservar como pendiente lo que el checklist dice que requiere QA funcional, a menos que haya evidencia posterior directa de sus factores/ACL.

### Fase 3

- **Perfil DEV actualmente incoherente con el QA esperado:** el Worker DEV más reciente es `bc22cfbc-8824-4c9a-82a0-b4dfa4333256`; su ruta de intake F3 respondió 404 porque el despliegue dejó `PHASE3_ENABLED=false`. La configuración `wrangler.phase2-dev.jsonc` mantiene esa bandera apagada. Falta perfil de release DEV explícito que reúna UI/Worker F3 con F4 y un smoke que compruebe endpoints/rutas antes de darlo por desplegado.
- **Ciclo autenticado de postulación/moderación:** probar envío sintético, lectura/decisión con admin AAL2, estado visible en Mi cuenta, enlaces privados de ambos documentos y motivo al solicitante. El usuario ya confirmó la apertura de documentos en DEV anteriormente, pero no hay evidencia positiva reciente para todo el flujo ni para expiración de enlaces.
- **Retiro de agentes:** objetos de la migración `20261106100000` existen en DEV según consulta anterior, pero la versión no aparece registrada; falta reconciliar el ledger sin reparación a ciegas. En producción el cambio de revocación auditada aún no está aplicado. La prueba requiere un agente sintético AAL2 y comprobar rol, bitácora, anuncios conservados y plaza liberada.
- **Correo y purga de documentos:** falta un ciclo sintético end-to-end que verifique entrega/error/reintento y eliminación de objetos tras la retención definida, sin usar documentos reales.

### Fase 4

- **QA autenticado funcional:** publicación/edición propia de servicios y materiales, almacenamiento privado/firma de imágenes, estados de disponibilidad, reseñas y moderación, contacto privado, beneficios manuales. HTTP 200 y disponibilidad de chunks no cierran persistencia, permisos ni UX.
- **Municipio en Materiales:** sigue pendiente. La UI no debe prometer este filtro hasta tener campo soportado por migración revisada, primero DEV, y conexiones de alta/edición/consulta probadas.
- **Regresión de favoritos SVC:** existe una nota histórica del `UNHANDLED_EXCEPTION`; falta retest autenticado reciente guardar/quitar/recargar. No hay evidencia suficiente para marcarlo cerrado.
- **Valoración y pagos:** valoración está aplazada y no bloquea alcance actual. No hay decisión comercial que autorice checkout, suscripción o bloqueo automático; conservar Benefits como informativo/concesión manual.

## Bloqueos de acceso en esta revisión

- La automatización de navegador no logró identificar con seguridad la pestaña autenticada, así que no se afirmó ningún resultado de UI que necesite sesión.
- La consulta de Supabase enlazada falló con 403 por falta del permiso `database_write`; solo se conservan evidencias read-only ya documentadas. No se tocó el esquema remoto.
- No se modificaron ni limpiaron cuentas, anuncios, CV, documentos, reseñas, favoritos o registros de prueba.

## Próximos pasos por orden seguro

1. Preparar y verificar el perfil DEV combinado F3/F4: bandera explícita, build íntegro desde fuente correspondiente y smoke autenticado/no autenticado; resolver primero el 404 F3 observado.
2. Reconciliar la migración de retiro de agente en DEV mediante comparación ledger/esquema, sin `db push` global ni `migration repair` hasta confirmar el nombre y cuerpo local exacto.
3. Completar los flujos F3 con fixtures sintéticos y AAL2; mantener producción sin cambios durante QA.
4. Completar la matriz funcional/responsive F4 y retestar favoritos.
5. Obtener medición pHash productiva read-only y cerrar evidencias de F1/F2 sin backfill.
6. Resolver municipio de Materiales mediante migración explícita solo después de revisar modelo, especificación y cadena de migraciones.

## Cambios documentales realizados

Esta revisión se agrega como un apéndice fechado; no reemplaza ni reescribe entradas históricas. Los pendientes se conservaron abiertos cuando la evidencia era solo local, HTTP, antigua o dependía de autenticación.

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
- [x] El diagnóstico seguro del envío de postulaciones está publicado en DEV: el bundle identifica fallos de Storage y persistencia con códigos seguros. Esto verifica el artefacto servido, no un envío end-to-end; siguen pendientes el envío sintético, el tratamiento real del error y el reintento sin duplicados. El aviso de fotos de Materiales y la normalización de enlaces privados también están publicados; falta comprobar expiración de enlaces.

## Orden recomendado de pruebas

### Historial privado de motivos de rechazo — DEV — 2026-11-08

> Snapshot inicial supersedido por la rectificación y evidencia autenticada que aparecen a continuación.

- [x] Implementación local: Postulaciones en Moderación incluye historial paginado de rechazos y muestra la nota como interna.
- [x] Pruebas locales de componente, lint, suite completa y build estándar: PASS (196 archivos; 882 aprobadas, 1 omitida).
- [x] Regresión de Mi cuenta: la prueba incluye deliberadamente una nota interna en el objeto de respuesta y confirma que el solicitante solo ve el estado (882 pruebas aprobadas).
- [x] La versión DEV desplegada incluye el historial; la verificación visual autenticada se completó después de este snapshot.
- [x] En navegador, la vista del moderador AAL2 mostró notas internas de dos postulaciones rechazadas; Mi cuenta del solicitante mantiene el estado genérico.

Esta sección registra el estado inicial y queda supersedida: el despliegue y la comparación de privacidad ya se comprobaron en DEV. No se modificaron solicitudes durante la comprobación.

### Rectificación — Historial privado de rechazos en DEV — 2026-11-08

- [x] La sección de historial presenta el motivo como nota interna en la vista de Moderación; la tarjeta de Mi cuenta consulta únicamente `agent_applications.status`.
- [x] RLS limita la lectura de `agent_application_events` a sesiones admin AAL2.
- [x] Pruebas focales locales: 2 archivos, 22 pruebas aprobadas; la cuenta solicitante no muestra el texto del motivo incluido deliberadamente en la respuesta de prueba.
- [x] Worker DEV `cubitat1-phase2-dev` activo en versión `dcf754bc-d5aa-44d2-9069-1cc510a8d0ec` (100% del tráfico, despliegue automático del 2026-11-09T00:47:32Z).
- [x] Smoke anónimo DEV: home 200; GET al endpoint de ingreso de postulaciones 405; GET a la ruta privada de documentos de una solicitud 401. Esto confirma las rutas y el rechazo sin sesión, pero no sustituye QA autenticado.
- [x] En navegador DEV, Mi cuenta muestra «Postulación no aprobada» y el texto genérico «Puedes revisar los requisitos y enviar una nueva postulación»; el comentario del moderador no aparece al solicitante.
- [x] En navegador DEV, con sesión de moderador AAL2, se abrió «Historial privado de rechazos» y se vieron las notas internas de dos solicitudes rechazadas.

La comparación visual confirma que la nota es solo para moderación: el postulante recibe el estado genérico y el moderador AAL2 ve la nota en el historial privado. No se alteraron solicitudes ni documentos. Producción y Supabase no se modificaron en esta comprobación.

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
- [ ] QA visual de los mensajes de error de postulación en DEV; el diagnóstico ya está desplegado, pero falta provocar una falla sintética y revisar la presentación.

### 3. F3 — negocio todavía provisional

- [x] Matriz provisional documentada: durante esta etapa, las prestaciones de agente existentes se consideran disponibles sin cobro ni bloqueo automático. No hay todavía una asignación definitiva de funciones gratis/de pago; suscripción, pagos y comisiones siguen pendientes de decisión e implementación. No presentar ingresos como liquidados.

| Prestación | Tratamiento provisional | Límite de esta decisión |
| --- | --- | --- |
| Panel y herramientas de agente ya implementadas | Sin cobro ni bloqueo por suscripción | Se mantienen los requisitos de rol/aprobación ya existentes. |
| Publicaciones y gestión de cartera del agente | Sin cobro automático ni paywall nuevo | Aplican moderación y reglas actuales del producto. |
| Contactos, métricas y referidos ya implementados | Sin cobro automático ni paywall nuevo | No se prometen métricas, cupos ni beneficios aún no validados. |
| Suscripciones, pagos y comisiones | No activar; pendiente | Requiere definir precios, prestaciones, ciclo de cobro, reembolsos y conciliación. |

Esta tabla es provisional y evita introducir cargos o bloqueos mientras se define el modelo comercial; no constituye el catálogo final de planes.
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

### Verificación de bundle DEV — 2026-11-08

- Confirmado por HTTP público: `/moderar` y el chunk `/assets/AgentApplicationsModerationTab-CyxjcX8Q.js` responden 200; el chunk contiene «Historial privado de rechazos» y «Nota interna».
- En el momento de esta comprobación HTTP aún faltaba inspeccionar los datos en sesión; el pendiente quedó cerrado después con la verificación autenticada de dos notas que consta arriba.
- Esta evidencia supersede las notas anteriores de este archivo que describían este módulo de historial como solo local o pendiente de despliegue; no certifica otros endpoints ni todos los flujos F3.
- Privacidad esperada: la nota queda solo para moderación AAL2; Mi cuenta muestra estado genérico. Producción y datos de Supabase sin cambios.
### Catálogos F4 — comparación de datos públicos DEV/producción — 2026-11-08

- [x] Se comprobaron por HTTP las rutas `/servicios` y `/materiales` y sus bundles actuales: responden 200 en DEV y producción.
- [x] Consulta pública de solo lectura, con los filtros que usa el directorio (`status=published`; Materiales excluye `out_of_stock`) y conteo exacto: DEV devuelve 100 servicios y 13 materiales; producción devuelve 0 servicios y 0 materiales en las tablas F4 consultadas.
- [x] El código servido incluye los directorios F4. La implementación pagina en lotes de 24 y presenta «Cargar más»; esto no equivale a validar todavía todos los filtros ni el total mostrado en cada combinación.
- [ ] Determinar si producción debe tener anuncios F4 públicos. No insertar datos ni cambiar estados de producción sin autorización explícita y un conjunto de anuncios/medios acordado.
- [ ] Continuar la prueba de filtros en DEV con valores que produzcan cero, una y varias páginas, y contrastar conteos con las tarjetas visibles.

### F4 — filtros del catálogo de Materiales comprobados en DEV — 2026-11-08

- [x] Sin filtros, el directorio muestra 13 anuncios; categoría Cemento muestra 2 y los dos corresponden a Cemento.
- [x] Disponibilidad: Disponible muestra 7, Disponibilidad limitada muestra 3 y Por encargo muestra 3; las tarjetas visibles corresponden al estado seleccionado.
- [x] Limpiar filtros restablece categoría, provincia y disponibilidad y devuelve los 13 anuncios.
- [ ] No se pudo validar paginación de varias páginas: 13 registros son menos que el tamaño de lote de 24. Probarla cuando DEV tenga más de 24 publicaciones sintéticas.
- [ ] Siguen pendientes los casos combinados de provincia/municipio y el filtro municipal, sujeto a reconciliar la migración de ubicación.
- Alcance: solo lectura e interacción de filtros en DEV. No se crearon ni alteraron publicaciones; producción y Supabase permanecen intactos.

## QA F4 — filtros y carga progresiva de Servicios en DEV — 2026-11-08

- [x] Categoría Electricidad: los resultados se limitaron a anuncios de esa categoría.
- [x] Provincia La Habana habilitó municipios; al elegir Centro Habana quedó 1 profesional y la ficha indicaba Centro Habana, Cerro · La Habana.
- [x] Búsqueda «Electricidad doméstica» mantuvo el resultado coincidente; combinarla con Plomería produjo el estado vacío esperado.
- [x] «Limpiar filtros» restableció categoría, provincia, municipio y búsqueda; el directorio volvió a mostrar 100 profesionales disponibles.
- [x] «Cargar más profesionales» anexó otra tanda de tarjetas sin recargar la página. La UI mantuvo el total disponible en 100.
- [ ] Pendiente contrastar el número exacto de tarjetas con el total y probar que la última tanda oculta el botón; la comprobación solo observó que el control cargaba más resultados.
- [ ] Responsive, estados de error/reintento, filtros restantes y autenticación todavía pendientes.
- Alcance: navegación pública de solo lectura en Worker DEV `cubitat1-phase2-dev`; no se alteraron publicaciones, Supabase ni producción.

## F4 — mapa provincial responsive en Servicios y Materiales — 2026-11-09

- [x] Se recuperó en la rama DEV la experiencia local del mapa agregado compartido: carga diferida, conteos por provincia y selección que filtra el catálogo, sin revelar coordenadas individuales.
- [x] Se corrigió la composición responsive de ambos directorios: escritorio muestra filtros, resultados y mapa en columnas; móvil abre el mapa y sus estados de carga/error como panel de pantalla completa, con cierre por botón/Escape y bloqueo/restauración del scroll.
- [x] Gates locales: lint y build `phase34-dev` PASS; `test:run` PASS (197 archivos, 884 aprobadas, 1 omitida). Bundles phase2/3/4 y verificación de secretos PASS.
- [x] Desplegado en Worker DEV `cubitat1-phase2-dev`, versión `7edc353e-7544-4167-b29a-957912ff745f`; producción intacta.
- [x] Smoke HTTP de `/servicios` y `/materiales`: ambos 200; sus bundles incluyen el lanzador y el mapa provincial diferido.
- [ ] QA visual/funcional en viewport móvil y escritorio: abrir mapa, selección provincial, cierre/Escape, scroll y estados de carga/error. Producción intacta.


### Retest del clic en mapa provincial — DEV — 2026-11-09

- La selección provincial reconoce clics tanto en círculos como en etiquetas numéricas; tocar un grupo acerca el mapa al grupo y tocar una provincia aplica su filtro.
- Gates: `npm run lint` PASS; `npm run test:run -- --maxWorkers=2` PASS (198 archivos, 888 aprobadas, 1 omitida); `npm run build:phase34-dev` PASS.
- Worker DEV `cubitat1-phase2-dev`, versión `b9fa6510-abe1-4cc9-b47d-6f13e0d45cda`. `/servicios` y `/materiales` responden HTTP 200; el chunk del mapa remoto coincide byte por byte con el local.
- [ ] Pendiente confirmar visualmente tras el despliegue el filtro provincial y el zoom de grupos. Producción y Supabase intactas; el smoke HTTP no demuestra interacción visual.

- [x] 2026-11-09 — Verificación live adicional: /servicios y /materiales en el Worker DEV devuelven HTTP 200; los bundles de ambos directorios y ProvinceAggregateMap coinciden byte por byte con web/dist local. El mapa está desplegado en DEV; la interacción visual en móvil/escritorio continúa pendiente. Producción y Supabase intactas.
- [x] 2026-11-09 — Pruebas focales del mapa en DEV/local: `provinceAggregates.test.ts` y `provinceMapInteractions.test.ts`, 2 archivos y 6 pruebas PASS. La QA visual responsive sigue abierta.

## Diseño compartido de Comprar en Servicios y Materiales — 2026-11-09

- [x] Implementada localmente una estructura compartida para la barra de filtros, el catálogo/mapa y los controles flotantes, reutilizando el patrón de Comprar y conservando los filtros específicos de cada directorio.
- [x] Lint y build `phase34-dev` PASS; verificadores del bundle Phase 2/3/4 y secretos PASS. Suite completa: 199 archivos PASS; 890 pruebas PASS y 1 omitida.
- [x] Desplegada en Worker DEV `cubitat1-phase2-dev`, versión `87febe0a-8e00-40e4-82f8-0727935295d7`.
- [x] Smoke HTTP: `/servicios`, `/materiales`, bundles de ambos directorios y chunk compartido del mapa responden 200.
- [ ] Pendiente QA visual/funcional en escritorio y móvil: disposición tipo Comprar, filtros, mapa y controles flotantes.
- Alcance: DEV solamente; producción y Supabase intactas.
## F4 — persistencia de barra de filtros en Servicios y Materiales — 2026-11-09

- [x] Causa localizada: `overflow-x: auto` estaba aplicado al mismo elemento sticky y hacía que la barra dejara de seguir el desplazamiento de la página.
- [x] Corrección implementada localmente: el wrapper sticky queda separado del carril que permite desplazamiento horizontal.
- [x] Lint, suite completa y build general PASS (891 pruebas aprobadas, 1 omitida).
- [ ] Build `phase34-dev` y verificación visual en DEV pendientes: el perfil no compila en este entorno sin `VITE_SUPABASE_ANON_KEY` del proyecto DEV. No se desplegó este cambio; producción y Supabase intactas.

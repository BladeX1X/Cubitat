# Encargo de auditoria integral de main

Fecha de preparacion: 2026-09-08
Repositorio: D:\Proyectos\Cubitat
Rama que se debe auditar: origin/main
Referencia informativa al crear este documento: df28e40

## Objetivo

Realizar una auditoria independiente, completa y basada en evidencia del estado
actual de origin/main. La revision debe encontrar defectos, regresiones, riesgos
de seguridad, inconsistencias de datos, deuda tecnica y vacios de pruebas o
documentacion.

Este encargo autoriza **auditar y documentar hallazgos**. No autoriza corregir
codigo, crear migraciones, modificar datos, desplegar, rotar secretos ni enviar
formularios en produccion.

## Reglas no negociables

- Auditar el commit actual de origin/main, no una copia antigua de main, dev ni
  una rama de trabajo.
- Registrar al inicio el SHA exacto auditado y la fecha/hora.
- Si el arbol compartido tiene cambios locales, no restaurarlos, moverlos,
  incluirlos ni hacer stash. Usar un worktree separado.
- No revelar valores de archivos .env, tokens, cookies, LocalStorage, claves,
  credenciales, enlaces de confirmacion o datos personales.
- No ejecutar git reset --hard, git checkout --, git clean, migraciones
  productivas, supabase db push sin --dry-run, purgas ni despliegues.
- Produccion es solo lectura y navegacion. No crear cuentas, propiedades,
  contactos, reportes, alertas, favoritos o eventos de moderacion.
- No completar CAPTCHA, MFA o TOTP mediante atajos. Si un flujo requiere
  intervencion humana, dejarlo como limitacion de cobertura.
- Fase 2 continua siendo solo DEV. En main se audita su aislamiento, no se
  habilita ni se promueve a produccion.
- No repetir secretos que hayan aparecido en conversaciones. La clave de
  moderacion IA se trata como material sensible y su vigencia o rotacion se
  reporta solo como estado, nunca con su valor.
- Ante un hallazgo critico explotable, detener las pruebas activas, conservar
  evidencia sanitizada y reportarlo sin intentar explotarlo.

## Lectura obligatoria

Leer completamente y en este orden:

1. AGENTS.md
2. .agents/AGENTS.md
3. web/AGENTS.md
4. Cubitat - Guia Operativa Fase 1.md
5. docs/DESPLIEGUE_COMPLETO.md
6. web/supabase/DATABASE_MIGRATIONS.md
7. docs/MULTI_AGENT_HANDOFF.md
8. Las especificaciones de web/openspec/specs/**/spec.md
9. Los Markdown asociados a los componentes revisados
10. G:\Mi unidad\Obsidian\Vault_IA_Second_Brain\02 Projects\Cubitat\Cubitat - Checklist de Lanzamiento.md
11. G:\Mi unidad\Obsidian\Vault_IA_Second_Brain\02 Projects\Cubitat\Cubitat - Roadmap Fase 1.md
12. G:\Mi unidad\Obsidian\Vault_IA_Second_Brain\02 Projects\Cubitat\Cubitat - Dashboard del Proyecto.md

El repositorio es la fuente de verdad para codigo, configuracion y migraciones.
El vault es la fuente de seguimiento operativo. Toda contradiccion entre ambos
es un hallazgo documental y debe citar las dos fuentes.

## Preparacion aislada

Preferir un worktree de auditoria para no afectar el checkout del usuario:

~~~powershell
cd D:\Proyectos\Cubitat
git fetch origin --prune
git worktree add ..\Cubitat-audit-main origin/main
cd ..\Cubitat-audit-main
git rev-parse HEAD
git status --short --branch
~~~

El estado esperado es un HEAD que coincida con origin/main y un arbol limpio.
No asumir que df28e40 seguira siendo el SHA vigente.

Para descubrir codigo, usar primero search_graph, trace_path,
get_code_snippet, query_graph y search_code. Usar busqueda directa para
literales, Markdown, JSON, TOML, SQL y configuracion, o cuando el grafo no sea
suficiente.

## Puerta tecnica

Ejecutar desde web/ y conservar resumen, duracion y resultado:

~~~powershell
npm ci
npm run lint
npm run test:run
npm run build
npm run audit:react
npm audit --omit=dev
~~~

Despues:

- Ejecutar npm run test:e2e contra un entorno local controlado.
- Revisar si npm run test:e2e:real crea datos. No ejecutarlo contra produccion
  dentro de esta auditoria.
- Confirmar que el build pasa ambos verificadores de aislamiento de Fase 2.
- No versionar dist/, reports/, salidas de auditoria ni artefactos de Wrangler.
- Si una herramienta falla por infraestructura, separar ese fallo de un fallo
  del producto y guardar el mensaje exacto sanitizado.

Si existe autenticacion valida de CLI, ejecutar solo comprobaciones remotas de
lectura o simulacion:

~~~powershell
npx supabase migration list --linked
npx supabase db lint --linked
npx supabase db push --linked --dry-run
npx wrangler versions list
~~~

No mostrar secretos ni usar un comando que los revele.

## Zonas calientes del historial reciente

Revisar primero estos cambios y sus interacciones, sin asumir que el cierre
documentado demuestra ausencia de regresiones:

- df28e40: el contacto debe ocultarse o bloquearse para propiedades no
  publicadas.
- 9394370: la taxonomia de busqueda debe coincidir con publicacion, URLs y datos
  historicos.
- f9b761b y 247cdcc: los telefonos internacionales deben validarse de forma
  consistente en cuenta, publicacion y contacto.
- 22c3bed y 4beca04: menu movil autenticado, scroll, barra inferior y acciones
  flotantes no deben solaparse.
- 5664bcd: la conversion de imagenes no debe depender de fetch(data URL) bajo
  CSP y el Worker debe preservar respuestas WebSocket 101.
- e4c6671: amenidades, piso/nivel y features deben persistir, editarse y
  mostrarse sin romper inmuebles historicos.
- 7ea2e77 y los cambios Auth cercanos: recovery MFA/AAL2, Turnstile, callback
  token_hash, PKCE y redirects productivos.

Usar git show y pruebas focales para cada cambio. Buscar tambien efectos
combinados: una validacion correcta en un formulario puede seguir siendo
incompatible con otro formulario, el Worker o el esquema.

## Alcance de la auditoria

### 1. Git, dependencias y cadena de suministro

- [ ] Confirmar SHA, historial reciente, tags, ramas y divergencia con
  origin/main.
- [ ] Revisar que no haya secretos, archivos locales, artefactos o credenciales
  versionados.
- [ ] Auditar dependencias directas y transitivas, vulnerabilidades,
  dependencias obsoletas y scripts de instalacion.
- [ ] Revisar workflows de CI/CD, permisos, acciones fijadas por version,
  variables y separacion entre build y deploy.
- [ ] Verificar que un build sea reproducible y no cambie archivos versionados.

### 2. Arquitectura y calidad

- [ ] Mapear app, pages, modules, shared, servicios, Worker y Supabase.
- [ ] Detectar dependencias circulares, cruces indebidos entre modulos,
  componentes demasiado grandes y duplicacion de logica.
- [ ] Revisar TypeScript estricto, tipos inseguros, casts, condiciones de
  carrera, efectos sin limpieza y estados asincronos incompletos.
- [ ] Revisar errores, timeouts, reintentos, cancelacion, estados
  loading/empty/error y mensajes seguros para el usuario.
- [ ] Confirmar que los logs pasan por el logger seguro y no contienen PII,
  URLs completas, tokens, objetos Error ni respuestas crudas.

### 3. Autenticacion y cuenta

- [ ] Registro con correo, validacion de contrasena y Turnstile.
- [ ] Login por correo y Google OAuth sin redireccion a localhost.
- [ ] Confirmacion portable por token_hash, compatible con otro dispositivo y
  sin error PKCE expuesto.
- [ ] Recuperacion en /recuperar-contrasena, limpieza de tokens y mensajes
  seguros.
- [ ] MFA/AAL2, expiracion, reuso de enlaces y sesiones viejas.
- [ ] Cierre de sesion, persistencia, cambio de usuario y ausencia de datos de
  la cuenta anterior.
- [ ] Edicion de nombre y telefono internacional sin verificacion obligatoria,
  con proteccion de campos privilegiados del perfil.
- [ ] Guards de /mi-cuenta y /moderar por rol y nivel AAL.

### 4. Publicacion y propiedades

- [ ] Crear en local la matriz de venta, alquiler y permuta para casa,
  apartamento y terreno.
- [ ] Revisar ubicacion, precio, moneda, descripcion, amenidades, piso/nivel y
  telefonos internacionales.
- [ ] Verificar borrador local, aislamiento por usuario, recuperacion tras
  recarga y limpieza despues de publicar.
- [ ] Auditar compresion WebP, limites, orden, borrado y consistencia
  transaccional entre Storage y base de datos.
- [ ] Confirmar estados pending_review, published, paused, owner_hidden y
  rechazados, incluidas transiciones autorizadas.
- [ ] Verificar que una propiedad no publica no aparezca en busqueda, detalle,
  sitemap ni formularios de contacto publicos.
- [ ] Revisar edicion, ocultamiento, restauracion y eliminacion por propietario.

### 5. Busqueda, resultados, mapa y detalle

- [ ] Probar filtros, URLs SEO, paginacion, orden, estados vacios y errores de
  red.
- [ ] Comparar taxonomia de publicacion con taxonomia de busqueda.
- [ ] Validar coordenadas canonicas, formato legado y datos invalidos sin
  derribar MapLibre.
- [ ] Probar lista/mapa, agrupaciones, carrusel, historial Atras y restauracion
  de estado.
- [ ] Revisar galeria, propiedades relacionadas, favoritos, compartir y
  metadatos por ruta.
- [ ] Confirmar que menu movil, barra inferior, mapa y acciones flotantes no se
  superpongan.

### 6. Contacto, reportes y moderacion

- [ ] Verificar localmente Turnstile, validacion, antispam, rate limiting,
  idempotencia y mensajes de exito/error.
- [ ] Confirmar que solo propiedades publicadas acepten contacto y revelen el
  canal correspondiente.
- [ ] Revisar autorizacion y RLS de contactos, reportes, notificaciones y
  auditoria de moderacion.
- [ ] Auditar moderacion IA: autenticacion, esquema de respuesta, fallos del
  proveedor, timeouts y fallback humano.
- [ ] Confirmar que ninguna clave de IA llegue al cliente o a Git.
- [ ] Revisar bitacora append-only y acciones administrativas por rol y AAL.

### 7. Supabase, SQL, RLS y Storage

- [ ] Comparar cada SQL de supabase/migrations/ con
  DATABASE_MIGRATIONS.md.
- [ ] Confirmar orden, indices, constraints, SECURITY DEFINER, search_path,
  grants y ownership.
- [ ] Construir una matriz local de anon, propietario, otro usuario, admin y
  service_role para tablas, RPC y buckets criticos.
- [ ] Revisar que RLS este habilitada y que USING/WITH CHECK cubran lectura y
  escritura.
- [ ] Verificar tipos, MIME, tamaño y rutas por propietario en property_images,
  avatars y buckets relacionados.
- [ ] Confirmar que dev-migrations/ no forme parte de la cadena productiva.
- [ ] No ejecutar pruebas mutantes contra produccion; usar Supabase local y
  transacciones con ROLLBACK.

### 8. Worker y seguridad HTTP

- [ ] Revisar proxy Supabase, allowlists de rutas, metodos, cabeceras y campos.
- [ ] Auditar CORS, CSP, HSTS, cookies, cache, redirects, canonicalizacion,
  limites de cuerpo y JSON invalido.
- [ ] Verificar rate limiting, identidad de cliente, expiracion y resistencia a
  bypass sin registrar PII.
- [ ] Confirmar manejo correcto de WebSocket 101, streaming y respuestas no
  JSON.
- [ ] Revisar endpoints de metricas y moderacion para 401/403, roles y filtrado
  de errores.
- [ ] Confirmar que los secretos solo sean bindings del Worker y que
  wrangler.jsonc no contenga valores sensibles.

### 9. PWA, offline y conexiones lentas

- [ ] Revisar manifest, iconos, service worker, actualizaciones y recuperacion
  de versiones antiguas.
- [ ] Confirmar estrategias de cache por recurso y que Supabase Auth, REST
  privado y datos de contacto no queden cacheados.
- [ ] Probar offline parcial, reconexion, borradores y mensajes cuando una
  accion necesita red.
- [ ] Auditar chunks, lazy loading, imagen LCP, fuentes y terceros.

### 10. Accesibilidad, responsive y experiencia

- [ ] Probar al menos 390x844, 768x1024 y 1440x900.
- [ ] Revisar teclado, foco, Escape, portales, dialogs, labels, nombres
  accesibles, contraste y regiones live.
- [ ] Confirmar objetivos tactiles de 44 px, ausencia de overflow y texto sin
  recortes o solapamientos.
- [ ] Revisar estados de carga, vacio, error, exito y confirmaciones
  destructivas.
- [ ] Ejecutar React Doctor y complementar con inspeccion manual.

### 11. Rendimiento, SEO y analitica

- [ ] Medir Home, resultados y detalle en movil frio con Slow 4G y CPU x4.
- [ ] Registrar LCP, CLS, INP/FCP, recursos bloqueantes y cadenas criticas.
- [ ] Auditar canonical, robots, Open Graph, descripciones y metadatos por ruta.
- [ ] Revisar sitemap determinista, solo con propiedades publicas y sin cambios
  masivos de lastmod por cada build.
- [ ] Confirmar que rutas privadas tengan noindex.
- [ ] Revisar GA4 y metricas sin enviar PII ni convertir fallos parciales en
  fallo total del panel.

### 12. Documentacion y operacion

- [ ] Contrastar README, especificaciones, despliegue, migraciones, runbooks,
  relevo y vault con el codigo actual.
- [ ] Detectar cifras, SHAs, versiones, pendientes y credenciales operativas
  vencidas o contradictorias.
- [ ] Verificar rollback de Worker y que la base de datos use migraciones
  correctivas, no rollback destructivo.
- [ ] Confirmar que contenido real y revision juridica sigan bloqueados mientras
  no exista evidencia nueva.
- [ ] Revisar que la rotacion pendiente de secretos comprometidos o caducados
  este registrada sin mostrar sus valores.

## Validacion visual y productiva

La comprobacion de https://cubitathome.com debe ser de solo lectura:

- Home, rutas SEO, resultados, mapa, detalle, acceso anonimo a cuenta y guard de
  moderacion.
- Consola, red, cabeceras, assets, manifest, service worker y metadatos.
- Comparar el asset productivo con el build auditado sin desplegar.
- No usar como evidencia una sesion desactualizada, cache viejo o una captura
  sin URL/fecha.
- Distinguir un error de servicio externo de un defecto propio.

Los flujos mutantes se validan localmente con fixtures sinteticos y limpieza
verificada. Si una prueba requiere produccion o un dispositivo humano, dejarla
pendiente con pasos exactos y evidencia requerida.

## Formato obligatorio del informe

Crear docs/AUDITORIA_MAIN_RESULTADOS_YYYY-MM-DD.md con:

1. SHA auditado, entorno, herramientas y limitaciones.
2. Hallazgos ordenados por severidad.
3. Cobertura ejecutada y resultados de comandos.
4. Matriz funcional: aprobado, fallo, no ejecutado o bloqueado.
5. Matriz de seguridad/RLS por rol.
6. Diferencias entre repositorio, produccion y vault.
7. Riesgos residuales y pruebas faltantes.
8. Plan de remediacion propuesto, sin implementarlo.

Cada hallazgo debe contener:

~~~text
ID: MAIN-P0-001
Severidad: P0 | P1 | P2 | P3
Confianza: alta | media | baja
Area:
Resumen:
Impacto:
Evidencia:
Archivo y linea:
Pasos de reproduccion:
Resultado esperado:
Resultado actual:
Prueba faltante o existente:
Remediacion propuesta:
~~~

Severidades:

- P0: compromiso activo, perdida grave de datos o produccion inutilizable.
- P1: seguridad alta, autorizacion incorrecta o flujo principal bloqueado.
- P2: defecto funcional relevante, regresion de UX/rendimiento o cobertura
  insuficiente con impacto real.
- P3: deuda tecnica, documentacion, mantenibilidad o mejora menor.

No presentar preferencias de estilo como bugs. Todo hallazgo debe tener
evidencia reproducible y referencia precisa de archivo y linea. Si no hay
hallazgos, decirlo expresamente y enumerar riesgos y pruebas no ejecutadas.

## Criterio de cierre

- [ ] El SHA auditado coincide con el origin/main registrado al inicio.
- [ ] Lint, pruebas, build y aislamiento tienen resultado documentado.
- [ ] Los doce bloques tienen evidencia o una limitacion explicita.
- [ ] Produccion no recibio escrituras ni despliegues.
- [ ] No quedaron cuentas, filas, objetos o archivos QA.
- [ ] El informe contiene hallazgos priorizados y referencias exactas.
- [ ] Las discrepancias con el vault estan listadas, pero no corregidas.
- [ ] El arbol auditado termina limpio.

## Prompt de inicio para el agente auditor

~~~text
Audita de forma independiente el origin/main actual de Cubitat siguiendo
docs/AUDITORIA_INTEGRAL_MAIN.md. La tarea es solo de auditoria: no corrijas
codigo, no despliegues y no escribas en produccion. Trabaja en un worktree
aislado, registra el SHA exacto y entrega
docs/AUDITORIA_MAIN_RESULTADOS_YYYY-MM-DD.md. Presenta primero los hallazgos,
ordenados P0-P3, con evidencia reproducible y referencias archivo:linea.
Contrasta repositorio, produccion de solo lectura y vault de Obsidian. Verifica
especialmente Auth/Turnstile/PKCE/MFA, publicacion y Storage, contacto,
moderacion IA, RLS, Worker, PWA, movil y el aislamiento de Fase 2.
~~~

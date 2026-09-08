# Validacion independiente del informe de auditoria de main

Fecha: 2026-09-08
Commit contrastado: df28e4050ba93d1185386f59f7ccd75ebe07b0fb
Alcance: validacion de hallazgos; sin correcciones ni despliegues

## Veredicto ejecutivo

El informe contiene hallazgos utiles, pero no debe usarse como evidencia final
sin esta correccion. Varios problemas son reales, aunque hay referencias de
linea, versiones, impactos y severidades incorrectas. Tambien marca como
aprobadas areas para las que no presenta una prueba suficiente.

Resultado de los diez hallazgos:

- 5 confirmados.
- 4 parcialmente confirmados o con evidencia materialmente incorrecta.
- 1 comportamiento real que no constituye un defecto bajo el contrato actual.

Prioridad real recomendada:

1. Evitar perdida de amenidades al editar propiedades.
2. Validar y normalizar telefonos del formulario de contacto en cliente y
   Worker.
3. Hacer determinista la prueba de ResultsPage.
4. Corregir controles inaccesibles y asociaciones de etiquetas.
5. Rotar la clave de Groq expuesta cuando el propietario autorice la ventana.
6. Corregir suscripciones, deuda de tipos, CI y documentacion.

## Fiabilidad del informe recibido

La cabecera de herramientas no coincide con el commit ni con el entorno
reproducido:

- El proyecto usa Vite 8.1.0, no 6.0.7.
- Usa Vitest 4.1.9, no 2.1.8.
- El script lint ejecuta Oxlint 1.71.0, no ESLint 9.17.0.
- El Wrangler local es 4.107.0, no 3.99.0.
- package.json declara web 0.0.0, no 0.1.0.
- La reproduccion actual se ejecuto con Node 22.22.2 y npm 10.9.7.

React Doctor encontro 186 diagnosticos, incluidos 7 errores, no solamente las
advertencias resumidas en el informe. Esos diagnosticos son hipotesis que
requieren triage; no todos son bugs.

Las afirmaciones generales de que Auth, RLS, PWA, accesibilidad y todos los
modulos estan aprobados exceden la evidencia presentada. Migration list,
db lint y dry-run no sustituyen una matriz RLS ejecutada por rol.

## Revision por hallazgo

### MAIN-P1-001 - Confirmado, severidad recomendada P2

La suite limpia falla en ResultsPage.test.tsx. La ejecucion completa produjo:

- 94 archivos de prueba.
- 93 aprobados y 1 fallido.
- 388 pruebas.
- 387 aprobadas y 1 fallida.

El fallo real esta en ResultsPage.test.tsx:264-290. El test espera que se
oculte una propiedad no verificada, pero PHASE_TWO_ENABLED queda en false
cuando no existe una URL local de Supabase.

La causa descrita es esencialmente correcta, pero la evidencia del informe no:
no falla una expectativa sobre getProperties ni esta en las lineas 501-523.

Remediacion: controlar explicitamente el feature flag en la prueba, sin
habilitar Fase 2 en builds productivos.

### MAIN-P1-002 - Comportamiento confirmado, no es P1

Sin VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY, TypeScript, Vite, PWA y ambos
verificadores de aislamiento terminan correctamente. El ultimo paso,
generate-sitemap.mjs, aborta de forma deliberada.

docs/DESPLIEGUE_COMPLETO.md:542-559 documenta esas variables como
precondicion del build y especifica que debe abortar si faltan o no hay red.
Por tanto, no es un defecto contra el contrato vigente.

No se recomienda un fallback silencioso de sitemap porque podria desplegar un
inventario incompleto. La mejora correcta seria crear un comando de
verificacion hermetica con fixtures, o configurar las variables publicas
read-only en CI.

Clasificacion: P3 como mejora de ergonomia/CI, no P1.

### MAIN-P2-001 - Confirmado, P2 alto

PublishPage.tsx:368-431 hidrata los booleanos solo desde features.
PublishPage.tsx:661-697 reconstruye amenities desde diez booleanos y reemplaza
el array completo durante una edicion.

La situacion productiva es mas amplia que el ejemplo del informe. Una consulta
anonima de solo lectura encontro:

- 304 propiedades publicadas.
- 179 con amenities.
- 0 con amenities y features vacio.
- 85 con al menos una amenidad que el formulario actual no representa.

Aunque el escenario features=null no aparece hoy entre las propiedades
publicadas, editar cualquiera de esas 85 puede eliminar amenidades no mapeadas.
No existe prueba de regresion para edicion heredada.

Remediacion: definir una conversion bidireccional canonica y preservar valores
desconocidos al guardar. No basta con leer solo garage y pool.

### MAIN-P2-002 - Confirmado, P2

DetailPage.tsx:1214-1252 envia el telefono sin validatePhone ni
normalizePhoneForStorage. El Worker en
src/worker/public-submissions.ts:134-171 solo exige longitud de 6 a 40.

Una cadena como abc---123 puede llegar a la RPC y almacenarse. El informe se
equivoca al afirmar que el backend la rechazaria despues de consumir
Turnstile: actualmente tampoco valida su formato.

Remediacion: reutilizar shared/lib/phone.ts en el cliente y aplicar una
validacion equivalente, independiente del cliente, en el Worker antes de
Turnstile y antes de la RPC. Añadir pruebas en ambas capas.

### MAIN-P2-003 - Parcialmente confirmado, severidad recomendada P3

- DetailPage.tsx:113-119 crea un timeout sin clearTimeout.
- shared/ui/carousel.tsx:105-117 registra select y reInit, pero solo elimina
  select.

La suscripcion reInit incompleta es un defecto real. El timeout pendiente solo
consulta el DOM y no actualiza estado, por lo que el impacto descrito como
advertencias de React o fuga relevante esta exagerado.

Remediacion: limpiar timeout y ambos listeners. Es una correccion pequeña de
ciclo de vida, no un P2 salvo evidencia de degradacion observable.

### MAIN-P2-004 - Confirmado, P2, evidencia original incorrecta

React Doctor reporta 68 diagnosticos de accesibilidad. Se confirmaron, entre
otros:

- Labels sin control asociado en DetailPage y PublishPage.
- Select y Textarea de reporte sin id/htmlFor.
- Breadcrumbs clicables implementados como span sin teclado.
- Galeria desktop implementada con div clicable sin teclado.
- Tarjetas de amenidades implementadas como div clicable sin semantica de
  checkbox.
- Controles de imagen sin nombre accesible.

La referencia del informe a ResultsPage.tsx:321 es falsa: esa linea renderiza
ResultsMapView y no un div interactivo.

Remediacion: dividir por familias en PRs pequeños. Usar button, checkbox,
fieldset/legend e id/htmlFor segun corresponda y añadir pruebas de teclado y
axe.

### MAIN-P3-001 - Confirmado, P3

.github/workflows solo contiene supabase-backup.yml. No existe un workflow de
PR para lint, pruebas y build.

La propuesta es valida, pero primero debe resolverse el test ambiental y
definirse como suministrar las variables publicas del sitemap sin secretos.

### MAIN-P3-002 - Parcialmente confirmado, P3

El Dashboard de Obsidian conserva en la linea 19 un commit y Worker antiguos.
Produccion esta actualmente al 100% en el Worker
a8ea998c-6fde-4805-90d8-a068d4df5087.

DATABASE_MIGRATIONS.md si contiene una duplicacion, pero no es la migracion
contact_requests_table indicada por el informe. Las lineas 124-130 y 144-149
repiten la migracion
20260719002000_enforce_server_side_turnstile_submissions.sql.

### MAIN-P3-003 - Parcialmente confirmado; Groq P2, Supabase no comprobado

La checklist demuestra que no se documento el cierre de la rotacion del
SUPABASE_MANAGEMENT_TOKEN, pero no prueba por si sola que el token actualmente
activo sea el original o siga vigente.

La clave Groq compartida en una conversacion si debe considerarse expuesta y la
checklist mantiene su rotacion pendiente. No se reproduce su valor. Por alcance
y posible consumo de cuota, se recomienda P2 operativo hasta rotarla.

### MAIN-P3-004 - Confirmado en direccion, evidencia inexacta, P3

Conteos actuales:

- PublishPage.tsx: 2072 lineas.
- DetailPage.tsx: 1522 lineas.
- worker.ts: 1418 lineas.
- AccountPage.tsx: 937 lineas.
- ResultsPage.tsx: 533 lineas.

Hay bastantes mas de siete usos de any fuera de pruebas. La ruta
worker/worker.ts citada no existe; el archivo real es src/worker.ts.

El hallazgo de mantenibilidad es valido, pero no debe convertirse en una
refactorizacion masiva. Separar primero logica con cobertura y reemplazar any
en fronteras de red y autorizacion.

## Hallazgos adicionales del contraste

1. React Doctor marca createObjectURL sin revokeObjectURL en el flujo KYC DEV.
   Requiere triage separado porque Fase 2 no se promueve a produccion.
2. React Doctor marca Response consumida sin comprobar status en worker.ts:877.
   Debe revisarse antes de aceptar el bloque Worker como completamente
   aprobado.
3. El CLI local de Supabase instalado en node_modules no encontro su binario
   win32-x64 bajo este worktree. Esto es un problema de tooling reproducible,
   no evidencia de fallo del esquema remoto.
4. El informe atribuye correspondencia commit-Worker sin mostrar una prueba de
   artefacto. Wrangler confirma el Worker activo, pero por si solo no demuestra
   equivalencia binaria con el commit.

## Orden de remediacion recomendado

### Lote 1 - Integridad funcional

1. Preservar amenities en edicion.
2. Validar telefono de contacto en cliente y Worker.
3. Añadir pruebas focales para ambos defectos.

### Lote 2 - Puerta de calidad

1. Hacer determinista ResultsPage.test.tsx.
2. Crear CI con variables publicas controladas o fixtures de sitemap.
3. Mantener el fallo explicito del sitemap productivo si falta configuracion.

### Lote 3 - Accesibilidad y ciclo de vida

1. Breadcrumbs y galeria con teclado.
2. Amenidades como controles semanticos.
3. Labels e IDs de formularios.
4. Limpieza de timeout y listener reInit.

### Lote 4 - Operacion y deuda

1. Rotar Groq con autorizacion expresa.
2. Verificar el estado real del token de gestion de Supabase.
3. Corregir documentacion duplicada y Dashboard.
4. Planificar refactor progresivo y tipado de fronteras.

## Estado de esta validacion

- Remediacion local implementada en `bugfix/confirmed-audit-issues`:
  preservacion de amenidades, validacion internacional de telefono en cliente
  y Worker, normalizacion antes de persistir, prueba DEV determinista y limpieza
  del timeout/listener confirmados.
- Puerta local superada el 2026-09-08: lint limpio, 96 archivos/394 pruebas y
  build/PWA correcto con 473 URLs; el sitemap conservo su hash original.
- No se desplego.
- No se escribieron datos en produccion.
- La unica consulta productiva adicional fue anonima y de solo lectura para
  contar propiedades publicadas y la compatibilidad de amenities.
- El informe original se conserva intacto.

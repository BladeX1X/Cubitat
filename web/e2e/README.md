# Pruebas E2E con cuentas reales

Las pruebas que escriben datos quedan omitidas por defecto. Para ejecutarlas se
requieren variables de entorno locales; nunca se deben escribir credenciales en
los archivos del repositorio.

Variables requeridas:

- `CUBITAT_E2E_EMAIL`: cuenta QA aislada.
- `CUBITAT_E2E_PASSWORD`: contraseña de la cuenta QA.
- `CUBITAT_E2E_SESSION`: sesión temporal de Supabase en JSON. Solo para una
  cuenta QA desechable en loopback cuando Auth local exige CAPTCHA y se obtiene
  la sesión mediante un enlace de acceso temporal. Mantenerla únicamente en el
  entorno del proceso; nunca guardarla en archivos ni imprimirla.
- `CUBITAT_E2E_ALLOW_MUTATIONS=true`: autorización explícita para crear y
  limpiar datos QA.
- `CUBITAT_E2E_BASE_URL`: destino opcional. Por defecto usa
  `http://127.0.0.1:5174`.
- `CUBITAT_E2E_SUPABASE_URL`: Supabase destino. Por defecto las pruebas que lo
  necesitan usan `http://127.0.0.1:54321`; no existe un fallback alojado.
- `CUBITAT_E2E_ALLOW_CLOUD=true`: excepción explícita para una ejecución
  manual contra una app y Supabase alojados. Ambos destinos deben declararse,
  usar HTTPS y pertenecer al mismo ámbito (local o alojado).
  `security.spec.ts` permanece restringido a loopback incluso con esta opción.

Las pruebas mutables deben usar un marcador único, localizar exactamente la fila
creada y limpiarla. Está prohibido eliminar la primera o la última fila de una
cuenta, porque podría pertenecer a otra ejecución o a un usuario real.

Las pruebas con escrituras validan además que tanto la app como Supabase usen
loopback. No se habilitan escrituras contra DEV ni producción con variables de
entorno. Para E2E locales, Playwright inicia Vite en modo `phase2-dev`, habilita
las rutas de Servicios, Rentar, Materiales y Negocios, y fija Supabase en
`http://127.0.0.1:54321`. No usa el proyecto alojado. Los recorridos que
interceptan sus lecturas pueden correr sin Supabase local; `security.spec.ts` y
los casos que necesitan persistencia sí requieren iniciar la instancia local
con `npx supabase start`.

`real-publish.spec.ts` acepta la sesión QA temporal o el inicio de sesión por
contraseña. En ambos casos mantiene la guarda de loopback y el consentimiento
`CUBITAT_E2E_ALLOW_MUTATIONS=true`; prueba Storage y la persistencia real de la
publicación únicamente en Supabase local, reabre el anuncio como su propietario,
comprueba que Mis publicaciones descarga y decodifica la portada privada y que
el editor recupera el contacto y la vista previa de la foto. También cambia el
contacto en el editor y sale sin guardar; después vuelve a leer
`property_contact_details` desde Supabase local y verifica que conserva los
valores originales antes de reabrir el formulario. Al final cambia el contacto,
guarda la edición y comprueba que el anuncio queda `pending_review` y que el
nuevo contacto persiste. La ejecución real más reciente pasó 1/1 con una cuenta
QA desechable, Supabase local y el Worker local de Wrangler. La publicación, la
foto y la cuenta QA se limpiaron al finalizar.

Esta prueba debe servirse mediante el Worker ejecutado localmente con Wrangler,
con sus assets `dist/` y las variables apuntando a Supabase local. Vite por sí
solo no monta `/api/property-images/upload`; usarlo como servidor de esta prueba
produce un falso fallo antes de completar la publicación. Si Auth local requiere
CAPTCHA, se puede crear una cuenta local desechable y pasar la sesión temporal
por `CUBITAT_E2E_SESSION`, solo en el entorno del proceso. El test elimina la fila
QA y los objetos de Storage de esa cuenta al terminar.

El caso usa la imagen válida `src/assets/hero.png` y espera a que el navegador
muestre la miniatura WebP antes de continuar. Así el E2E no se queda esperando
si un archivo fixture no se pudo decodificar. La ejecución real más reciente
pasó con una sesión de un solo uso en Supabase local; no se conectó a DEV ni a
producción.

`real-marketplace-publish.spec.ts` verifica Servicios y Materiales con dos fotos
cada uno en Supabase local y el Worker local de Wrangler. Comprueba estado
`pending_review`, rutas privadas legibles por el propietario y limpia las fotos
después de quitar sus referencias; el proceso externo elimina la cuenta QA
desechable para retirar también sus filas. Servicios usa carga Storage directa
con JWT; Materiales comprueba propiedad mediante el RPC autenticado y guarda los
bytes a través del gateway. La ejecución más reciente pasó 2/2, sin filas QA ni
objetos recientes restantes. No usa DEV ni producción.

## Flujos de catálogo simulados y alertas reales locales

`search-alerts-flow.spec.ts` abre primero el diálogo de acceso desde resultados
como visitante. Luego acepta una sesión QA temporal por `CUBITAT_E2E_SESSION`
cuando Auth local requiere CAPTCHA, comprueba que la alerta pendiente se cree y
aparezca en Mi cuenta, y elimina solo esa alerta. La corrida real más reciente
pasó 1/1 en Supabase local y eliminó la cuenta QA temporal; no escribe en DEV ni
producción.

`search.spec.ts` y `turnstile.spec.ts` usan `propertyFixtures.ts` para responder a las lecturas de propiedades sin depender de una instancia local de Supabase. El fixture respeta los filtros PostgREST usados por el catálogo y las recomendaciones, evitando que un mock demasiado amplio fabrique propiedades similares repetidas. Estas pruebas validan navegación y UI con anuncios sintéticos; no verifican consultas, autenticación ni persistencia reales.

## Middleware de seguridad en el servidor Vite

`security.spec.ts` también prueba `/api/ai-moderate` y `/api/metrics` servidos por Vite. Para la ejecución local predeterminada, Playwright lee `ANON_KEY` desde `supabase status -o env` en memoria y solo la pasa al servidor Vite con `VITE_SUPABASE_URL=http://127.0.0.1:54321`; no imprime ni persiste la clave. Inicia Supabase local antes de ejecutar la suite para que los handlers puedan validar las credenciales inválidas y el proxy alcance PostgREST. Si la instancia no está activa, los flujos E2E simulados aún pueden correr, pero las verificaciones de `security.spec.ts` no quedan validadas.

La prueba proxy consulta `properties`. Si la tabla no está instalada, acepta `PGRST205` (404); si existe pero el rol anónimo no tiene permisos, acepta `42501` (401). Ambos códigos prueban que el proxy llegó a PostgREST en vez de fallar por conectividad (502). La inyección/saneamiento de cabeceras se valida por separado en pruebas unitarias del Worker.

### Lecturas Supabase auxiliares en E2E simulados

Los recorridos locales de publicación y Mis publicaciones interceptan lecturas PostgREST auxiliares para las dos rutas que usa Vite: /rest/v1/... y /api/supabase/rest/v1/.... Así estos E2E no dependen de que Supabase local esté encendido; las escrituras relevantes de cada flujo se verifican con fixtures de prueba y no representan persistencia real.

`service-publish-images.spec.ts` recorre la selección de varias fotos y simula
que Supabase confirma el perfil pero la respuesta se pierde. Al reintentar,
verifica que se reutilicen el identificador y las rutas de las fotos, y que el
perfil existente se actualice en vez de duplicarse. Es una prueba con API
interceptada, no una escritura real en Supabase.

`search-alerts.spec.ts` recorre dos variantes: creación desde una sesión
autenticada con navegación a Mi cuenta y eliminación; y creación como visitante
tras conservar los filtros, iniciar sesión y reanudar la alerta. La
autenticación, Turnstile y PostgREST son simulados en memoria; no escribe en
cuentas ni en Supabase remoto.

`material-publish-images.spec.ts` incluye un caso de respuesta perdida al crear
un anuncio de Materiales: el servidor de prueba conserva la fila, el primer
request de navegador se aborta y el segundo recibe la colisión de slug. El flujo
comprueba que el mismo slug recupere el ID del borrador propio y actualice ese
anuncio aunque se haya cambiado el título. Todo usa API simulada, sin escrituras
reales.

`catalog-detail-loading.spec.ts` simula lecturas de detalle lentas después de
cargar los catálogos. Comprueba que Servicios y Materiales muestran un indicador
de carga, sin presentar brevemente un anuncio como inexistente, al abrir una
tarjeta y al volver a la ficha con Atrás/Adelante. Las filas son sintéticas y
las solicitudes de listado/detalle están interceptadas; no escribe datos.

`edit-property-coordinates.spec.ts` selecciona un punto en el mapa del editor,
recorre los pasos restantes y comprueba que las coordenadas llegan al guardado
de la publicación. La propiedad y las llamadas a Supabase están simuladas; el
mapa y sus teselas se cargan desde el proveedor configurado.

`property-contact-actions.spec.ts` abre una ficha sintética de Comprar y
comprueba que `Consultar` solicita el contacto privado al Worker al hacer clic,
abre WhatsApp con el título de la publicación y no recarga la ficha. Tanto el
contacto como las respuestas de Supabase son simulados; no se contacta a nadie.

`property-share.spec.ts` comprueba en la ficha de Comprar que clics repetidos no
abren más de una operación nativa de compartir a la vez y que se habilita de
nuevo al cerrarla. La API nativa y el conteo de vistas se simulan; no se comparte
un enlace externamente ni se actualiza el anuncio.

`marketplace-favorites.spec.ts` prueba localmente ambos tipos de favorito: guardar
desde Servicios/Materiales, mostrar el anuncio en `/favoritos` y quitarlo desde
esa página hasta volver al estado vacío, y el prompt correcto para visitantes. Sesión y API se simulan en memoria; no
se escriben favoritos en la cuenta ni en Supabase.

`my-marketplace-listings.spec.ts` comprueba los estados y las reglas de edición
de «Mis perfiles» y «Mis anuncios», además del reintento tras fallar la lectura.
La API está simulada; no valida persistencia real ni acceso entre cuentas.

`publish-images.spec.ts` también recorre los ocho pasos del asistente de
publicación a 320 px y comprueba que el documento no desborde horizontalmente.
Además simula un fallo temporal al leer una foto privada del editor y verifica
que «Reintentar» recupera la vista previa sin escribir la propiedad. La sesión,
Storage y las lecturas de la API son simulados; la prueba no envía la propiedad.

`publish.spec.ts` recorre la edición hasta «Contacto y Publicar»: comprueba que
«Salir sin guardar» no envía ninguna escritura y que «Guardar Cambios» sí envía
el contacto actualizado con estado `pending_review`. PostgREST y la sesión están
simulados; la persistencia real se cubre aparte en `real-publish.spec.ts`.

`search.spec.ts` comprueba `/resultados` a 320 px: conserva visible la primera
tarjeta, abre y cierra la hoja móvil de filtros y mide que ni el documento ni
el panel excedan el viewport. Datos y API son sintéticos; no escribe datos.

La configuración local limita Playwright a dos procesos de Chromium. Con la
paralelización automática (12 procesos en esta estación), mapas, filtros y
acciones de contacto excedían los tiempos por competencia de CPU/red; los 13
casos fallidos al ejecutar en paralelo pasaron al repetirlos con dos procesos.

En la suite completa de 2026-11-15, tres primeras apariciones de catálogo/ficha
agotaron el timeout predeterminado de 5 s, aunque sus cuatro casos focales
pasaron con un trabajador. Se amplió a 15 s solo la espera de los datos iniciales
en esos recorridos; la repetición completa con dos trabajadores terminó con 59
aprobados, 3 omitidos por credenciales QA y 0 fallidos. No se cambiaron límites
globales ni se habilitaron escrituras alojadas.

`turnstile.spec.ts` verifica que el widget no duplique el script externo ni emita la advertencia de carga repetida cuando la API global ya está presente. La ejecución es local y no valida Turnstile real alojado.

# Metadatos SEO y control de indexacion

## Purpose
Evitar metadatos heredados entre rutas SPA y excluir de buscadores los entornos
no canonicos y las paginas privadas.

## Requirements

### Requirement: Metadatos completos por navegacion SPA
El sistema MUST reemplazar titulo, descripcion, imagen, URL y tipo social cada
vez que cambia la pagina visible.

#### Scenario: Navegar desde una propiedad hacia una pagina privada
- GIVEN una propiedad definio descripcion, imagen, URL y tipo `article`
- WHEN el usuario navega dentro de la SPA hacia una pagina sin metadatos propios
- THEN el sistema MUST restaurar descripcion e imagen genericas de Cubitat
- AND MUST usar como URL la ruta actual sin query string ni fragmento
- AND MUST cambiar el tipo a `website`
- AND MUST NOT conservar datos de la propiedad anterior

#### Scenario: Una pagina proporciona una URL explicita con parametros
- GIVEN una pagina proporciona una URL absoluta con query string o fragmento
- WHEN el sistema actualiza los metadatos Open Graph
- THEN `og:url` MUST contener solamente el origen y pathname
- AND MUST NOT copiar parametros ni fragmentos

#### Scenario: Canonical de una ruta publica
- GIVEN el Worker entrega HTML de una ruta publica en el dominio canonico
- WHEN la URL contiene parametros de seguimiento o un fragmento
- THEN el documento MUST incluir un unico `link[rel="canonical"]`
- AND su `href` MUST contener solamente el origen y pathname de la ruta

### Requirement: Rutas no indexables
El Worker MUST excluir de indexacion entornos no canonicos y rutas privadas.

#### Scenario: Entorno de preview o staging
- GIVEN una solicitud llega a un host distinto de `cubitathome.com` y no es local
- WHEN el Worker entrega HTML desde assets o cache
- THEN la respuesta MUST incluir `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`

#### Scenario: Ruta privada en produccion
- GIVEN una solicitud llega al dominio canonico
- WHEN la ruta corresponde a cuenta, favoritos, publicaciones, edicion,
  moderacion, publicacion, callback o recuperacion
- THEN la respuesta MUST incluir `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`

#### Scenario: Respuesta de propiedad cacheada en staging
- GIVEN existe HTML de una propiedad en Cloudflare Cache
- WHEN staging sirve esa respuesta cacheada
- THEN el Worker MUST reaplicar las cabeceras actuales antes de responder

#### Scenario: Propiedad inexistente o no publica
- GIVEN una URL de detalle contiene un UUID valido
- WHEN Supabase no devuelve una propiedad publicada para ese UUID
- THEN el Worker MUST responder `404`
- AND MUST incluir `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`
- AND el HTML MUST NOT declarar una URL canonical

### Requirement: Sitemap limitado a contenido indexable
El sitemap MUST anunciar solamente rutas estaticas canonicas, propiedades
publicadas y landings SEO respaldadas por inventario publicado.

#### Scenario: Combinacion geografica sin publicaciones
- GIVEN ninguna propiedad publicada coincide con una operacion, provincia y
  municipio
- WHEN se genera `sitemap.xml`
- THEN esa landing MUST NOT aparecer en el sitemap

#### Scenario: Varias propiedades comparten una landing
- GIVEN dos o mas propiedades publicadas coinciden con la misma landing
- WHEN se genera `sitemap.xml`
- THEN la landing MUST aparecer una sola vez

#### Scenario: Regeneracion sin cambios de inventario
- GIVEN el inventario publicado y sus fechas de actualizacion no cambiaron
- WHEN se genera `sitemap.xml` en dias distintos o Supabase devuelve las filas
  en otro orden
- THEN el contenido generado MUST ser identico
- AND las rutas MUST estar ordenadas por URL canonica
- AND `lastmod` MUST provenir de una fecha real de actualizacion, no de la
  fecha de ejecucion del build

#### Scenario: Build sin credenciales locales de Supabase
- GIVEN no hay configuradas ambas variables públicas de Supabase
- WHEN se genera el sitemap de producción o DEV
- THEN el generador MUST leer el inventario publicado por el proxy del mismo
  sitio objetivo (`cubitathome.com` o el Worker de DEV)
- AND MUST solicitar únicamente los campos públicos de propiedad y el estado
  `published`
- AND MUST fallar el build si el proxy devuelve error o una respuesta inválida
- AND MUST NOT escribir el sitemap del entorno DEV sobre los archivos fuente

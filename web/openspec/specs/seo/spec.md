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

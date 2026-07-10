# Cubitat Specs

Estas specs documentan requisitos estables por modulo y por proceso. Deben actualizarse cuando cambie el comportamiento esperado, antes o junto con la implementacion.

## Modulos existentes

- `auth`: registro, login, recuperacion y cierre de sesion.
- `search`: busqueda, filtros, URL y ordenamiento.
- `properties`: catalogo, detalle, publicacion base y reportes.
- `maps`: mapas de detalle y busqueda.
- `results-map-view`: modulo aislado para la vista de mapa movil dentro de resultados.
- `media`: normalizacion, optimizacion y fallback de imagenes.

## Procesos principales

- `publication`: crear, editar, guardar borrador y publicar anuncios.
- `account`: centro de cuenta, verificacion, contacto y alertas.
- `favorites`: guardar, listar y quitar favoritos.
- `results`: lista, mapa movil, ordenamiento y alertas.
- `contact`: llamada, consulta y privacidad de contacto.
- `administration`: moderacion y acceso admin.
- `navigation`: rutas, alias y retorno despues de login.

## Roles cubiertos

- `anonimo`: puede buscar, navegar, ver detalle, iniciar contacto limitado y autenticar.
- `usuario autenticado`: puede guardar favoritos, crear alertas, administrar cuenta y contactar.
- `anunciante`: puede publicar, editar, pausar y consultar sus publicaciones.
- `moderador/admin`: puede revisar publicaciones, reportes, usuarios y tomar acciones sensibles.

## Fases funcionales

- `descubrimiento`: home, busqueda, resultados, mapa, detalle y navegacion SEO.
- `conversion`: contacto, consulta, llamada, favoritos y alertas.
- `publicacion`: alta, borradores, edicion, imagenes, contacto y estado del anuncio.
- `operacion`: cuenta, mis publicaciones, administracion, moderacion y reportes.
- `plataforma`: auth, permisos, media, mapas, seguridad de rutas y resiliencia.

## Convencion

Cada spec usa:

- `Purpose`: objetivo del modulo o proceso.
- `Requirement`: comportamiento obligatorio o deseado.
- `Scenario`: casos verificables con formato GIVEN/WHEN/THEN.

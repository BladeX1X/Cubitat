# Directorio de profesionales del hogar

## Propósito

Permitir que propietarios y negocios publiquen servicios para vivienda y que
visitantes descubran profesionales por categoría y zona. La publicación es un
listado comercial moderado; no certifica licencias, identidad profesional ni
calidad del trabajo.

## Requisitos

### Listado y detalle públicos

- **WHEN** un visitante abre el directorio o filtra por categoría/provincia
- **THEN** solo ve perfiles con estado `published`
- **AND** la respuesta pública no incluye datos privados de cuenta ni estados
  internos de moderación
- **AND** la ficha muestra categoría, descripción, zonas de cobertura, galería,
  fecha de actualización y formas de contacto públicas elegidas por el proveedor

### Publicación y edición

- **GIVEN** un usuario autenticado
- **WHEN** crea un perfil profesional
- **THEN** queda `pending_review` y no aparece en el directorio público
- **AND** el propietario solo puede editar su propio perfil
- **AND** cambios sustanciales a un perfil público vuelven a revisión

### Moderación

- **WHEN** un administrador con AAL2 aprueba, rechaza o pausa un perfil
- **THEN** se registra actor, fecha y motivo cuando corresponda
- **AND** un usuario sin rol y nivel de autenticación requeridos no puede moderar

### Accesibilidad y conectividad

- Las páginas deben ser utilizables en móvil, por teclado y con lector de
  pantalla; contemplan carga, error, estado vacío y reintento.
- Las galerías cargan miniaturas optimizadas y diferidas.
- Reseñas son una extensión opcional especificada en
  `phase4-review-reputation/spec.md`; el directorio sigue funcionando apagada.

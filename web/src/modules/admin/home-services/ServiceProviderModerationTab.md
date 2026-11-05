# ServiceProviderModerationTab

## Responsabilidad

Muestra solicitudes de perfiles de profesionales y perfiles publicados que se
pueden pausar. Solo opera sobre el dominio F4-SVC.

## Acceso y límites

- Solo se monta cuando F4-SVC está habilitado, dentro de la compuerta
  administrativa AAL2 existente.
- El cliente no recibe `owner_id`, contacto del propietario ni otros metadatos
  internos de las filas.
- La acción usa `moderate_home_service_provider`; el rol y AAL2 se comprueban en PostgreSQL.
- La bitácora pertenece al dominio de servicios y no incluye reseñas ni materiales.
- El módulo no está disponible en producción.

## Verificación

Probar en DEV con sesión admin AAL2: cola vacía, error de sesión, aprobación,
rechazo con motivo y pausa de un perfil publicado. No usar producción.

# Supabase Database Migrations

Registro operativo de las migraciones de Cubitat. La fuente de verdad son los
archivos SQL versionados en `supabase/migrations/`; este documento resume su
orden y propósito, pero no sustituye la lectura del SQL.

Última revisión documental: 2026-07-12.

## Aplicación segura

Desde `web/`, revisar primero y aplicar después:

```powershell
npx supabase db push --linked --dry-run
npx supabase db push --linked --yes
```

Para enlazar el proyecto por primera vez:

```powershell
npx supabase login
npx supabase link --project-ref tohjzoncoosvjbjcakdl
```

No editar el esquema directamente en producción ni usar rollbacks destructivos.
Toda corrección debe añadirse como una migración nueva y numerada. La ejecución
manual desde SQL Editor queda reservada para contingencias y debe respetar
exactamente el orden cronológico de los archivos.

## Inventario activo

### Esquema inicial — 2026-06-30

1. `20260630140623_create_properties_schema.sql`: crea el esquema inicial de propiedades.
2. `20260630140801_populate_properties.sql`: carga los datos iniciales de propiedades.
3. `20260630163630_create_profiles_table.sql`: crea perfiles y su integración inicial con Auth.
4. `20260630212733_fix_trigger_search_path.sql`: fija el `search_path` seguro del trigger de perfiles.
5. `20260630213000_fix_trigger_column_name.sql`: corrige la columna utilizada por el trigger.
6. `20260630215300_create_saved_properties.sql`: crea favoritos por usuario.
7. `20260630222901_create_notifications_table.sql`: crea notificaciones.
8. `20260630224844_add_publish_fields_to_properties.sql`: agrega campos del flujo de publicación.
9. `20260630224905_create_property_images_bucket.sql`: crea y protege el bucket `property_images`.

### Perfil y administración — 2026-07-02 a 2026-07-05

10. `20260702001000_add_profile_avatar_and_phone_verification.sql`: agrega avatar y verificación telefónica.
11. `20260704000000_add_admin_role.sql`: incorpora el rol administrador.
12. `20260704000001_add_admin_policies.sql`: agrega políticas administrativas.
13. `20260704000002_allow_users_read_own_properties.sql`: permite leer propiedades propias no públicas.
14. `20260704000003_add_property_moderation_message.sql`: agrega el mensaje de moderación.
15. `20260705000000_secure_properties_policies.sql`: endurece las políticas de propiedades.

### Reportes, roles, Storage y moderación — 2026-07-06

16. `20260706000000_create_property_reports.sql`: crea denuncias con inserción pública y gestión administrativa.
17. `20260706001000_protect_profile_roles.sql`: impide cambios de rol no autorizados.
18. `20260706002000_fix_profile_role_protection_metadata.sql`: corrige la protección de roles y metadatos.
19. `20260706003000_harden_properties_and_reports_policies.sql`: endurece RLS de propiedades y reportes.
20. `20260706004000_protect_phone_verification_status.sql`: protege el estado de verificación telefónica.
21. `20260706005000_secure_property_image_upload_paths.sql`: restringe las rutas de subida de imágenes.
22. `20260706006000_allow_owner_edits_without_autopublish.sql`: permite editar sin autopublicación.
23. `20260706007000_add_ai_approved_property_status.sql`: agrega el estado `ai_approved`.
24. `20260706007001_add_ai_rejected_property_status.sql`: agrega el estado `ai_rejected`.
25. `20260706008000_allow_owner_edits_preserve_admin_update.sql`: conserva la edición administrativa.
26. `20260706009000_allow_ai_property_statuses_for_insert.sql`: admite estados iniciales de moderación IA.
27. `20260706200000_secure_profiles_role_escalation.sql`: refuerza la prevención de escalación de roles.

### Endurecimiento adicional — 2026-07-07 a 2026-07-09

28. `20260707000000_secure_profiles_phone_verification.sql`: refuerza la protección de verificación telefónica.
29. `20260707001000_secure_storage_property_images_isolation.sql`: aísla imágenes por propietario.
30. `20260708000000_restrict_ai_moderation_statuses.sql`: restringe transiciones de moderación IA.
31. `20260709000000_security_harden_profiles_moderation.sql`: consolida seguridad de perfiles y moderación.

### Rendimiento y funciones operativas — 2026-07-10 a 2026-07-11

32. `20260710000000_add_performance_indexes.sql`: agrega índices para consultas frecuentes.
33. `20260710000500_backfill_seed_property_contact_info.sql`: completa contacto en propiedades iniciales.
34. `20260710001000_create_property_status_notifications.sql`: notifica cambios de estado.
35. `20260710002000_create_search_alerts.sql`: crea alertas de búsqueda por usuario.
36. `20260710003000_create_contacts_table.sql`: crea la persistencia de contactos o leads.
37. `20260710004000_create_contact_notifications_trigger.sql`: notifica al propietario sobre nuevos contactos.
38. `20260711001000_cascade_delete_properties_user_id.sql`: sincroniza el borrado en cascada de propiedades.
39. `20260711002000_harden_profiles_contacts_reports.sql`: restringe perfiles a dueño/admin, valida formularios públicos, fija el `search_path` del trigger de contactos y agrega índices de auditoría.
40. `20260712000000_create_admin_metrics_rpc.sql`: crea una función admin-only para consultar tamaño de base de datos, Storage y conteos operativos sin exponer filas.

## Verificación después de aplicar

- Confirmar que `supabase migration list --linked` no muestre diferencias.
- Probar lectura pública únicamente de propiedades publicadas.
- Probar acceso del propietario a borradores y publicaciones propias.
- Probar que otro usuario no pueda editar propiedades, imágenes, favoritos ni alertas ajenas.
- Probar que solo un administrador pueda moderar y consultar denuncias.
- Probar inserción de contactos y generación de su notificación.
- Probar que un usuario no pueda elevar su rol ni marcar su teléfono como verificado.
- Probar subida y borrado de imágenes dentro de la carpeta autorizada del propietario.
- Registrar cualquier migración nueva en este inventario dentro del mismo cambio.

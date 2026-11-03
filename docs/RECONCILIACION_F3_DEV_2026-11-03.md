# Reconciliación de esquema F3 en Supabase DEV — 2026-11-03

## Alcance y seguridad

Lectura solamente sobre el proyecto vinculado `bknwerqbbysveehcdmzr` (DEV), mediante `supabase migration list --linked` y consultas a catálogos de PostgreSQL/Storage. No se ejecutó `db push`, `migration repair`, DDL, cambios de permisos ni operaciones de datos. Producción no se consultó ni modificó.

## Historial remoto observado

El ledger actual contiene **11 versiones solo locales** y **58 versiones solo remotas**. Este estado difiere de capturas/notas anteriores: algunas migraciones antiguas antes reportadas como pendientes ahora aparecen registradas remotamente; la salida actual debe ser la base para la siguiente reconciliación.

Versiones solo locales:

| Versión | Archivo | Esquema esperado en DEV |
|---|---|---|
| 20261010120000 | `phase2_seller_badge_and_document_audit` | No comprobado en esta consulta |
| 20261010130000 | `property_image_phash_duplicates` | No comprobado en esta consulta |
| 20261012170000 | `include_verified_admin_sellers` | No comprobado en esta consulta |
| 20261013110000 | `count_only_comparable_property_images` | No comprobado en esta consulta |
| 20261013180000 | `temporary_admin_mfa_bypass` | No comprobado en esta consulta |
| 20261103120000 | `agent_application_intake` | Objetos principales ausentes, ver tabla siguiente |
| 20261103130000 | `agent_application_review_actions` | Función de revisión ausente |
| 20261103140000 | `agent_application_email_outbox` | Outbox y RPC ausentes |
| 20261103150000 | `agent_application_province_capacity` | Tabla de cupos ausente |
| 20261103160000 | `agent_application_evidence_retention` | RPC de purga ausentes |
| 20261103170000 | `agent_signup_referral_attribution` | Ledger y trigger de atribución ausentes |

Versiones solo remotas (sin archivo local correspondiente en esta rama):

`20260930170000`, `20261022140000`, `20261023170000`, `20261023190000`, `20261023200000`, `20261024120000`, `20261024130000`, `20261024140000`, `20261024150000`, `20261024170000`, `20261024180000`, `20261024220000`, `20261024230000`, `20261024235000`, `20261024235950`, `20261024235955`, `20261024235957`, `20261024235958`, `20261024235959`, `20261025000000`, `20261025030000`, `20261025040000`, `20261025050000`, `20261025060000`, `20261025070000`, `20261025100000`, `20261025110000`, `20261025120000`, `20261025130000`, `20261025150000`, `20261025160000`, `20261025170000`, `20261025180000`, `20261025190000`, `20261025200000`, `20261025230000`, `20261025235900`, `20261025240000`, `20261025250000`, `20261026210000`, `20261026220000`, `20261026231000`, `20261026232000`, `20261026233000`, `20261026234000`, `20261027223000`, `20261028170000`, `20261028180000`, `20261028190000`, `20261028200000`, `20261029100000`, `20261029120000`, `20261029130000`, `20261029140000`, `20261030100000`, `20261030150000`, `20261030160000`, `20261101185000`.

## Contraste de objetos F3 en DEV

| Migración/capacidad | Objeto inspeccionado | Resultado |
|---|---|---|
| Intake | `public.agent_applications` | Ausente |
| Intake/revisión | `public.agent_application_events` | Ausente |
| Intake | bucket privado `agent_application_documents` | Ausente |
| Revisión | `public.review_agent_application(uuid,text,text)` | Ausente |
| Outbox | `public.agent_application_email_outbox` | Ausente |
| Outbox | claim/complete/release de correo | Ausentes |
| Cupo provincial | `public.agent_province_assignments` | Ausente |
| Retención | claim/complete/release de purga | Ausentes |
| Atribución | `public.agent_signup_attributions` | Ausente |
| Atribución | trigger `agent_signup_attributions_immutable` | Ausente |
| Enlace referido existente | `public.agent_referral_links` y `ensure_agent_referral_link()` | Existen; EXECUTE denegado a `authenticated` y `anon` |

## Conclusión y siguiente paso

El esquema funcional de las seis migraciones F3 **no está instalado en DEV**. Sin embargo, el historial es híbrido: el ledger incluye 58 versiones remotas sin fuentes locales en esta rama, por lo que `db push` podría intentar recrear o cambiar orden de trabajo no reconstruible desde este checkout. No registrar versiones con `migration repair` solo para limpiar el listado: primero recuperar desde Git/artefactos el SQL fuente de las 58 versiones, identificar su efecto y comparar su esquema; después preparar un plan de reconciliación revisable.

La rama candidata ahora incluye el perfil de compilación F3 productivo y código Worker detrás de `PHASE3_ENABLED=false`. Esto no habilita el módulo: antes de deploy todavía se necesita reconciliar el ledger, instalar/verificar el esquema de forma segura, configurar secretos y realizar QA autenticado en DEV.

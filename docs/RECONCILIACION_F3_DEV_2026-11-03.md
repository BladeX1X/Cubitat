# Reconciliación de esquema F3 en Supabase DEV — 2026-11-03

## Alcance y seguridad

Lectura solamente sobre el proyecto vinculado `bknwerqbbysveehcdmzr` (DEV), mediante `supabase migration list --linked` y consultas a catálogos de PostgreSQL/Storage. No se ejecutó `db push`, `migration repair`, DDL, cambios de permisos ni operaciones de datos. Producción no se consultó ni modificó.

## Historial remoto observado

El ledger actual contiene **11 versiones solo locales** y **57 versiones solo remotas**. Este estado difiere de capturas/notas anteriores: algunas migraciones antiguas antes reportadas como pendientes ahora aparecen registradas remotamente; la salida actual debe ser la base para la siguiente reconciliación.

La fuente `20260930170000_property_verification_audit.sql`, que aparecía remota sin archivo local, se recuperó byte por byte de Git. El blob recuperado coincide con el histórico (`95118b38d7d93ba974cc73d31f76ba7c61cd210e`), por lo que esa versión ahora figura tanto local como remotamente.

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

Versiones que el ledger marcaba solo remotas (57 al consultar antes de recuperar fuentes):

`20261022140000`, `20261023170000`, `20261023190000`, `20261023200000`, `20261024120000`, `20261024130000`, `20261024140000`, `20261024150000`, `20261024170000`, `20261024180000`, `20261024220000`, `20261024230000`, `20261024235000`, `20261024235950`, `20261024235955`, `20261024235957`, `20261024235958`, `20261024235959`, `20261025000000`, `20261025030000`, `20261025040000`, `20261025050000`, `20261025060000`, `20261025070000`, `20261025100000`, `20261025110000`, `20261025120000`, `20261025130000`, `20261025150000`, `20261025160000`, `20261025170000`, `20261025180000`, `20261025190000`, `20261025200000`, `20261025230000`, `20261025235900`, `20261025240000`, `20261025250000`, `20261026210000`, `20261026220000`, `20261026231000`, `20261026232000`, `20261026233000`, `20261026234000`, `20261027223000`, `20261028170000`, `20261028180000`, `20261028190000`, `20261028200000`, `20261029100000`, `20261029120000`, `20261029130000`, `20261029140000`, `20261030100000`, `20261030150000`, `20261030160000`, `20261101185000`.

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

## Fuentes recuperadas del checkout de auditoría (2026-11-03)

Se localizaron 56 archivos SQL de esas versiones en `D:\cubitat\web\supabase\migrations` y se copiaron a esta rama aislada. Los SHA-256 origen/destino coinciden en los 56; la fuente no estaba registrada en Git en ese checkout, por lo que queda identificada como copia candidata y no como procedencia histórica confirmada. También se localizó `20261101185000_phase4_listing_ai_moderation_claims_reconciled.sql` en `D:\cubitat\web\supabase\dev-migrations`; se copió a `dev-migrations` y el SHA-256 coincide. Se conserva como migración exclusiva de DEV y no se convierte en parte de la cadena estándar/productiva.

No queda otra versión de esas 57 sin una fuente identificada: 56 corresponden a la cadena estándar y una a una migración DEV-only. Aún falta probar que el replay completo reproduce el esquema esperado y cotejar el catálogo alojado. La lectura de esquema anterior sigue vigente para las seis migraciones F3: sus objetos funcionales están ausentes en DEV.

Gates ejecutados en el worktree aislado tras incorporar las fuentes: `npm run lint` PASS; `npm run test:run -- --maxWorkers=2` PASS (181 archivos, 814 pruebas, 1 omitida); `npm run build` PASS con sitemap estático de fallback; `npm run build:phase3-production:ci` PASS con configuración pública ficticia de CI. El job de replay de base de datos debe repetirse en GitHub para validar las 56 migraciones recuperadas. Hubo avisos de entorno de pruebas al intentar conectar a `localhost:3000` y cargar Turnstile; la suite finalizó correctamente.

## Conclusión y siguiente paso

El esquema funcional de las seis migraciones F3 **no está instalado en DEV**. Las fuentes de las 57 versiones remotas están ahora localizadas, pero 56 proceden de archivos sin registrar en Git del checkout de auditoría y requieren validar el replay y sus efectos antes de considerarlas canónicas. La versión `20261101185000` permanece solo en `dev-migrations`, de acuerdo con su alcance DEV. No registrar versiones con `migration repair` ni ejecutar `db push`: primero comprobar el replay aislado, comparar el catálogo resultante con DEV y resolver las cinco versiones F2 y seis F3 que sí son locales pero no remotas.

La rama candidata ahora incluye el perfil de compilación F3 productivo y código Worker detrás de `PHASE3_ENABLED=false`. Esto no habilita el módulo: antes de deploy todavía se necesita reconciliar el ledger, instalar/verificar el esquema de forma segura, configurar secretos y realizar QA autenticado en DEV.

## Resultado de integración en `main` — 2026-11-03

PR #186 se fusionó como `99e315369c3d1f69f58a699a9d1a635971bbb4ef`; `quality` y `database-security` PASS en el candidato. El replay fue de CI aislado y no verifica equivalencia íntegra del catálogo alojado. La lectura DEV sigue en 11 versiones locales sin registro: cinco F2 y seis F3. Los objetos F3 siguen ausentes; pHash está presente y con ACL AAL2 observadas. No se ejecutó `db push`, reparación del ledger, DDL hosted ni despliegue. La bandera F3 permanece apagada. El siguiente paso es revisar las cinco migraciones F2 una a una y preparar un plan explícito para solo F3 en DEV sin saltarse dependencias.

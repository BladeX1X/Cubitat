# Promoción de Fase 3 a producción — evaluación actual

Fecha: 2026-11-03  
Estado: **preparación en curso; no desplegada en producción**.  
Rama candidata: `feature/phase3-production-main`, basada en `origin/main` (`d491419`).

## Alcance y decisiones del dueño

El dueño pidió promover Fase 3 completa. Para la primera salida, las funciones actuales se mantienen gratuitas: no se aceptan cobros, no se muestra paywall ni se bloquean funciones automáticamente. La matriz definitiva gratis/de pago queda pendiente; el alcance de monetización sigue apagado.

Para postulaciones, el correo receptor `pochiprats18@gmail.com` es provisional. Se aceptan PDF/JPG/PNG hasta 10 MB y se elimina el CV 30 días después de la decisión final. El documento debe quedar en almacenamiento privado; las notificaciones llevan enlaces firmados, nunca el archivo adjunto.

## Estado observado

- Candidato aislado en `D:\cubitat-phase3-release`, rama basada en `origin/main`; no contiene F4 y conserva los cambios sin commit para revisión.
- La rama local de Supabase se verificó de vuelta en DEV (`bknwerqbbysveehcdmzr`).
- Auditoría de solo lectura en Supabase producción (`tohjzoncoosvjbjcakdl`): no se encontraron tablas ni RPC de F3 en el catálogo consultado. No se escribieron filas ni se cambió esquema, secreto, flag o Worker.
- Los módulos de oportunidades y comisiones manuales existen en el candidato, pero no completan el contrato F3 actual. En particular, la comisión actual ligada a `lead_id` no representa 20% de pagos de suscripción.
- A/postulaciones y CV, B/C/atribución inmutable de altas, I/suscripciones y E/ledger recurrente aún no están implementados como flujos completos. El panel de crecimiento no está integrado en el panel administrativo de producción.

## Bloqueos de release

1. **Decisiones aún abiertas:** la matriz final gratis/de pago; hasta entonces rige la política provisional sin cobros ni bloqueos. Confirmar también que el correo provisional es el receptor definitivo antes de enviar CV reales.
2. **Backend productivo:** producción no tiene el esquema F3. El inventario `web/supabase/DATABASE_MIGRATIONS.md` registra historial híbrido y versiones locales remotas/duplicadas, incluidas variantes con timestamps colisionados. No se debe ejecutar `db push` ni `migration repair` ni deducir una migración por similitud. Hace falta una cadena canónica revisada, primero probada en entorno efímero/DEV.
3. **QA de flujos:** faltan pruebas autenticadas positivas/negativas por rol y pruebas de privacidad, retención, cuotas provinciales, atribución, pagos manuales, reembolsos y auditoría.
4. **Build/Worker:** todavía no existe un perfil productivo de F3 que incluya exclusivamente sus capacidades y RPC, manteniendo el aislamiento de F4 y las rutas/secretos de producción.

## Ruta siguiente

1. Implementar A y validar archivos reales, bucket privado, enlaces breves, expiración a 30 días, rate limit, CAPTCHA y cupo provincial concurrente.
2. Implementar B/C en el alta confiable; mantener visitas desactivadas y probar autorreferidos, códigos inválidos, idempotencia y aislamiento.
3. Implementar la suscripción informativa con la política provisional: precios no cobrados y ninguna pérdida automática de funciones. Mantener transferencia y conciliación apagadas hasta cerrar la matriz final.
4. Sustituir la comisión heredada por un ledger append-only ligado a pagos verificados; mientras no existan pagos, no generar ni liquidar comisiones.
5. Integrar paneles F/G solo después de implementar las operaciones correspondientes y proteger las decisiones administrativas con AAL2.
6. Crear migraciones canónicas sin colisiones, validar RLS/grants en local/DEV, cerrar el build y los checks obligatorios, ejecutar QA por roles y preparar smoke/rollback.
7. Promover a GitHub `main` y desplegar Worker/assets y esquema únicamente después de superar esos gates; verificar en producción con evidencia observable.

## Historial de operaciones

- Producción inspeccionada solo con consultas de catálogo; F3 no aparece en los objetos revisados.
- No ejecutados en producción: `db push`, `migration repair`, cambios de esquema/datos/secretos/flags, ni despliegue Cloudflare.
- La auditoría previa local y los resultados de DEV no se consideran verificación de producción.

## Validación del candidato — 2026-11-03

- `npm run lint`: PASS.
- `npm run test:run -- --maxWorkers=2`: 173 archivos PASS; 760 pruebas PASS y 1 omitida.
- `npm run build`: TypeScript/Vite compilaron; los guards del bundle, Worker y secretos PASS. La etapa final de sitemap detuvo el comando porque faltan `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en este entorno. No se copiaron secretos ni se declaró el build de release como PASS.

## Revalidación técnica del candidato — 2026-11-03

- `npm run lint`: PASS.
- `npm run test:run -- --maxWorkers=2`: 174 archivos PASS; 767 pruebas PASS y 1 omitida.
- `npm run build`: PASS en local. Como no hay configuración pública de Supabase en este entorno, genera explícitamente un sitemap local estático con solo `/` y `/resultados`; no modifica los archivos fuente `public/sitemap.xml` ni `public/robots.txt`.
- El build de producción ahora invoca `generate-sitemap.mjs --require-dynamic`. Se comprobó que sin la URL pública exacta de Supabase producción se detiene antes de empaquetar/desplegar; no se usó ni se buscó una credencial.
- Esta protección no cierra F3: el candidato sigue sin los flujos de postulaciones/CV, atribución confiable, suscripciones y ledger recurrente descritos arriba. No se hizo merge a `main`, despliegue ni cambios en Supabase producción.

## Integración revisable — 2026-11-03

- Commit candidato `900f261` publicado en `feature/phase3-production-main`; PR borrador: https://github.com/BladeX1X/Cubitat/pull/186.
- Se mantiene como borrador y no debe fusionarse: el objetivo es revisar el trabajo existente mientras se completan las brechas de F3 y se reconcilia el ledger migratorio.
- Se separó el perfil CI (`build:phase2-production:ci`, sitemap estático explícito) del comando de producción (`build:phase2-production`, sitemap dinámico obligatorio). Con la URL pública y una anon key ficticia, el perfil CI de producción pasó todos sus guards; el build real sigue requiriendo la anon key válida de producción.

## Build dinámico de producción ejecutado por el usuario — 2026-11-03

- El usuario ejecutó `npm.cmd run build:phase2-production` en `D:\cubitat-phase3-release\web` con la URL del proyecto productivo y una clave `sb_publishable_...` de Supabase.
- Resultado informado en la terminal: build completo y guards de Fase 2 PASS; el generador consultó el catálogo publicado y creó un sitemap dinámico de 446 URLs.
- Esto es una validación local con configuración pública de producción; no es un despliegue ni valida por sí sola flujos autenticados de F3.
- El build regeneró `public/sitemap.xml` y `public/robots.txt`; se restauraron al estado versionado para no guardar artefactos generados. El resultado de build permanece en `dist/` ignorado por Git.
- GitHub Actions para el commit `b23a3fe` completó los dos workflows duplicados (quality y database-security) en PASS.

## Inicio de validación de documentos de postulaciones — 2026-11-03

- Se añadió al candidato una utilidad del Worker que identifica PDF/JPG/PNG por firma de bytes y acepta como máximo inclusivo 10 MiB por archivo; no confía en el MIME del navegador.
- Pruebas dirigidas: 4/4 PASS, incluidos encabezados truncados/no admitidos y límite exacto de 10 MiB frente a 10 MiB + 1 byte.
- La utilidad aún no recibe solicitudes ni escribe archivos. No hay formulario, endpoint de carga, bucket privado, revisión AAL2, notificación, cuota provincial ni purga; la sección A de F3 continúa abierta.
- Sin migración, cambios en DEV/producción, merge ni despliegue. Siguiente implementación: endpoint de postulación autenticado y almacenamiento privado con pruebas de autorización, límites y limpieza ante fallos.

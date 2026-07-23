# Checklist de implementación

- [x] Añadir regresiones SQL para verificación, MFA, Storage y perfiles públicos.
- [x] Endurecer la migración pendiente de Fase 2.
- [x] Permitir en el proxy solo las RPC públicas/autenticadas necesarias.
- [x] Sustituir URL pública KYC por ruta privada y enlace firmado temporal.
- [x] Corregir reputación por defecto y lectura pública de anunciantes.
- [x] Añadir guard de rol y modularizar el panel de agente.
- [x] Implementar envío programado de alertas en el Worker sin secretos Vite.
- [x] Mover la migración de Fase 2 a `supabase/dev-migrations/`.
- [x] Ocultar todas las superficies de Fase 2 en builds de producción.
- [x] Limitar el Cron y `PHASE2_ENABLED` al entorno `env.dev` de Wrangler.
- [x] Dejar el Supabase DEV cerrado por defecto hasta configurar su URL real.
- [x] Ejecutar lint, pruebas, build y `wrangler deploy --dry-run`.
- [x] Actualizar documentación del repositorio y notas afectadas del vault.

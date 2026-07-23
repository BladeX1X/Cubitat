# Integración segura de Fase 2

## Problema

Los módulos de KYC, perfiles de agentes, reputación y alertas pasan sus pruebas
unitarias aisladas, pero sus contratos no coinciden con las fronteras reales de
producción: el proxy bloquea las RPC KYC, los documentos se tratan como públicos,
la lectura pública de agentes contradice RLS y un fallo de perfil otorga confianza
por defecto. El dispatcher de correo tampoco tiene un consumidor server-side.

## Objetivo

- Mantener toda la Fase 2 exclusivamente en DEV hasta una decisión posterior.
- Ocultar KYC, agentes, reputación y panel de agente en builds de producción.
- Mantener la migración fuera de `supabase/migrations/` y el Cron fuera del
  entorno productivo de Cloudflare.
- Impedir que un usuario modifique su propio estado de verificación.
- Exigir administrador AAL2 para leer o resolver solicitudes KYC.
- Almacenar documentos KYC en un bucket privado con rutas internas y enlaces
  firmados de corta duración para moderación.
- Exponer perfiles de anunciantes mediante una RPC pública de campos mínimos.
- No mostrar reputación si no existe evidencia verificable.
- Ejecutar correos de alertas exclusivamente desde el Worker programado.
- Mantener carga, vacío, error y guards explícitos en las pantallas nuevas.

## Fuera de alcance

- Aplicar migraciones, crear recursos o desplegar en producción.
- Usar el proyecto Supabase productivo para pruebas de Fase 2.
- Revisar documentos reales o modificar solicitudes KYC existentes.
- Cambiar el proveedor de correo o el plan de Supabase.

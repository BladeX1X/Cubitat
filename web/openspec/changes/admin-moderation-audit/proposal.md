# Bitácora inmutable de moderación

## Problema

Las acciones administrativas sobre propiedades cambian o eliminan información,
pero hoy no dejan una evidencia durable y consultable. Además, la finalización
de moderación IA usa el JWT del usuario para un RPC que exige rol admin y el
Worker no valida el error HTTP, por lo que el fallo puede quedar silencioso.

## Objetivo

- Registrar de forma atómica cambios de estado, motivo y eliminaciones.
- Evitar que clientes o `service_role` alteren o borren eventos existentes.
- Permitir lectura paginada únicamente a administradores.
- Separar la ejecución IA en un RPC exclusivo del Worker con `service_role`.
- Añadir la capacidad como módulo independiente `admin/audit-log`.

## Fuera de alcance

- Auditoría de inicios de sesión, contactos o cambios de perfil.
- Exportación legal, retención configurable o SIEM externo.
- Aplicar la migración o desplegar a producción sin validación y autorización.


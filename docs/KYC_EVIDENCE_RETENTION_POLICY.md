# Política de retención de evidencia KYC

Estado: **aprobada para Fase 2**  
Fecha de decisión: 2026-09-30  
Responsable: propietario del producto

## Regla

Las dos evidencias privadas de una solicitud KYC (`document_path` y
`selfie_path`) se conservan durante **24 horas después de que la solicitud sea
aprobada o rechazada**. La regla aplica igual a ambos estados; no se conserva
una copia de las imágenes después de esa ventana.

El registro mínimo de la solicitud permanece en Postgres con su estado, fechas
y, cuando corresponde, el motivo de rechazo. Las rutas de Storage se vacían
solamente después de confirmar que la eliminación de los objetos terminó.

## Controles

- El bucket `kyc_documents` es privado.
- La reclamación y la finalización de la purga solo están disponibles para
  `service_role`.
- La tarea se ejecuta en el Worker y procesa lotes pequeños.
- Un fallo libera el reclamo para permitir reintento; no se marca como purgado
  hasta completar la operación.
- La eliminación es irreversible: antes de activarla debe existir respaldo y
  debe revisarse el conteo de solicitudes que quedarían fuera de la ventana.

## Fuera de esta política

La retención de `auth.audit_log_entries` mantiene su política independiente de
90 días móviles. No se elimina ni se cambia por esta regla KYC.

Las alertas por correo son otro módulo: solo envían notificaciones pendientes,
con idempotencia y hasta tres intentos; no eliminan datos.

## Criterio de verificación

Se considera operativo cuando la migración productiva está aplicada, el Worker
procesa la tarea programada, los tests de purga pasan y una prueba controlada
confirma que un objeto con vencimiento se elimina mientras uno no vencido se
conserva.

# Política de retención de logs y auditoría

Estado: **propuesta pendiente de aprobación humana**  
Fecha: 2026-08-08  
Responsable de aprobación: propietario del producto

Esta política separa los logs efímeros de proveedores, los eventos de
autenticación persistidos en Postgres y la evidencia de un incidente. No
autoriza por sí sola ninguna purga, cambio de plan, Log Drain ni desactivación
de auditoría.

## Decisión propuesta

| Fuente | Retención propuesta | Tratamiento |
| --- | ---: | --- |
| Cloudflare Workers Logs | Retención nativa del plan | Mantener `invocation_logs` deshabilitado. No exportar logs completos ni ampliar su retención mientras los eventos seguros actuales sean suficientes. |
| Supabase Logs Explorer (API, Auth, Postgres, Storage y funciones) | Retención nativa del plan | Consultar solo durante una investigación concreta, con ventana estrecha y campos mínimos. No crear Log Drains sin una necesidad operativa y presupuesto aprobados. |
| `auth.audit_log_entries` en Postgres | **90 días móviles** | Mantener la escritura habilitada. Tras aprobación e implementación separada, eliminar únicamente filas con más de 90 días mediante una tarea servidor, en lotes y con conteo verificable. |
| Evidencia de un incidente confirmado | **180 días desde el cierre** | Conservar un resumen mínimo y sanitizado en el registro del incidente. No copiar tokens, contraseñas, cookies, cuerpos completos ni dumps indiscriminados. |
| Retención legal o investigación activa | Hasta autorización de cierre | Suspender la eliminación únicamente para la evidencia identificada; documentar responsable, motivo y fecha de revisión. |

La ventana de 90 días es una recomendación operativa, no una obligación legal:
equilibra investigación de accesos, minimización de IP/user-agent/identificadores
y uso de almacenamiento. Debe revisarse con asesoría jurídica si Cubitat adopta
requisitos regulatorios, contratos empresariales o trata categorías especiales
de datos.

## Límites actuales de proveedores

- Cloudflare documenta Workers Logs por 3 días en Workers Free y 7 días en
  Workers Paid; la retención máxima nativa es 7 días.
- Supabase documenta Logs Explorer por 1 día en Free, 7 días en Pro, 28 días en
  Team y 90 días en Enterprise. Log Drains requiere Pro, Team o Enterprise.
- Supabase Auth registra eventos también en `auth.audit_log_entries`; desactivar
  esa escritura reduce almacenamiento, pero **Cubitat no debe desactivarla** sin
  una decisión posterior explícita.

Fuentes oficiales consultadas el 2026-08-08:

- <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>
- <https://supabase.com/docs/guides/telemetry/logs>
- <https://supabase.com/docs/guides/auth/audit-logs>
- <https://supabase.com/pricing>

## Reglas de acceso y minimización

1. Acceder a logs solo para soporte, seguridad, fraude o diagnóstico concreto.
2. Usar la ventana temporal más corta y seleccionar únicamente los campos
   necesarios.
3. No registrar ni copiar correos, teléfonos, IDs, IP, user-agent o URL completa
   salvo que sean indispensables para el incidente y estén protegidos en su
   expediente.
4. Nunca conservar tokens, contraseñas, secretos, cookies, códigos MFA ni
   cuerpos completos de terceros.
5. La interfaz administrativa mantiene autenticación y AAL2; una eventual tarea
   de purga debe ejecutarse solo en servidor con privilegio mínimo.
6. Registrar únicamente fecha, rango, cantidad eliminada y resultado de cada
   purga; no duplicar el contenido eliminado en el log de la propia tarea.

## Implementación posterior a la aprobación

La aprobación de esta política no equivale a ejecutar SQL. La implementación
debe ser otro cambio revisable que incluya:

1. consulta de conteo y antigüedad sin mostrar contenido sensible;
2. función servidor con corte fijo de 90 días y eliminación por lotes;
3. bloqueo explícito a `anon` y `authenticated`;
4. modo de simulación que solo cuente filas;
5. prueba de retención legal o incidente activo;
6. métrica de filas eliminadas y error clasificado, sin PII;
7. rollback documentado antes del primer uso productivo;
8. ejecución manual inicial con autorización destructiva independiente.

## Fuera de alcance

- Esta política no modifica la retención KYC de Fase 2 DEV: evidencia aprobada
  a las 24 horas y rechazada a la hora. Ese flujo sigue fuera de producción.
- No define conservación de contratos, facturas, expedientes legales ni copias
  de seguridad de la base de datos.
- No autoriza una migración, Cron, `DELETE`, Log Drain, cambio de plan ni
  despliegue.

## Aprobación

- [ ] Propietario del producto aprueba 90 días para `auth.audit_log_entries`.
- [ ] Propietario del producto aprueba 180 días para evidencia sanitizada de
  incidentes confirmados.
- [ ] Revisión jurídica confirma o ajusta las ventanas antes de alegar
  cumplimiento regulatorio.


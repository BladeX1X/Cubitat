# Suscripciones y facturación informativa — Fase 3

## Alcance actual

La primera entrega solo publica el catálogo versionado de precios. No inicia
pruebas, registra cuentas de facturación o pagos, integra una pasarela, cobra,
aplica paywall ni bloquea funciones. Todas las funciones actuales permanecen
gratuitas mientras la matriz definitiva de acceso no esté aprobada.

## Requisito: catálogo CUP versionado

- GIVEN un visitante o usuario consulta los planes publicados
- WHEN el servidor devuelve el catálogo
- THEN MUST mostrar persona natural: 200 CUP por 3 meses y 500 CUP por 12
  meses; persona jurídica: 10 000 CUP por 3 meses y 30 000 CUP por 12 meses
- AND MUST obtener precios desde filas versionadas en base de datos
- AND MUST NOT permitir que roles de API inserten, actualicen o borren precios
- AND MUST devolver solo la versión vigente más reciente de cada combinación
- AND MUST preservar versiones históricas ante cambios de precio
- AND MUST NOT inferir de la presencia de un plan que exista un cobro o
  suscripción activa

## Requisito: no activar cobros ni restricciones

- GIVEN el catálogo está disponible
- WHEN un usuario navega por Cubitat o termina cualquier período informativo
- THEN MUST mantener todas las funciones actuales disponibles
- AND MUST NOT crear una suscripción, iniciar una prueba ni modificar acceso
  por consultar el catálogo
- AND MUST NOT aceptar pagos o comprobantes mediante este contrato

## Seguridad y ownership

- El dominio billing es dueño de `billing_plan_versions` y
  `get_active_billing_plans()`.
- El cliente solo obtiene lectura mediante la función de catálogo.
- Las filas son inmutables para roles de API; cambios futuros se publican con
  nuevas versiones usando una migración privilegiada.
- Crear cuentas empresariales, períodos de prueba, pagos manuales, entitlements,
  renovaciones, avisos y comisiones requiere contratos separados y pruebas antes
  de habilitar cualquier flujo.

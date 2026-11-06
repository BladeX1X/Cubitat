# Panel privado del agente

## Responsabilidad

`AgentDashboardPage` coordina el resumen y la gestión de publicaciones del
agente autenticado. Fase 3 extiende esta página con `AgentGrowthPanel`, que se
carga únicamente cuando la bandera local `PHASE_THREE_ENABLED` está activa.
Mientras el dueño define las reglas comerciales, el panel muestra únicamente
el registro y seguimiento de oportunidades.

## Acceso y datos

- Se requiere rol canónico `agent` o `admin` y KYC `verified`; los admins
  verificados también participan como agentes.
- La página carga primero el perfil y consulta propiedades solo después de
  confirmar rol elegible y KYC verificado. Usuarios no elegibles reciben una
  explicación del requisito y un acceso a Mi cuenta sin iniciar la consulta de
  propiedades del dashboard.
- El bloque de oportunidades tampoco se monta ni consulta datos privados hasta
  que termine la verificación de elegibilidad.
- Si falla la lectura del perfil o publicaciones, se muestra un error genérico
  con una acción funcional para reintentar la carga.
- Los contadores de teléfono y WhatsApp se obtienen mediante una RPC `SECURITY
  DEFINER` que solo devuelve métricas propias al usuario autenticado con rol
  `agent`/`admin` y KYC verificado. El cliente no tiene `SELECT` directo sobre
  esas columnas. Si falla la RPC, las publicaciones siguen visibles y los
  contadores se muestran como no disponibles, no como cero.
- Las tablas privadas y RPC del módulo validan nuevamente la identidad, el rol y
  el acceso; la condición visual de la página no es autorización de servidor.
- Enlaces de referido, visitas, atribución de contactos y comisiones están
  pendientes de definición y no se muestran en el panel. Las oportunidades de
  propiedad/cliente requieren autorización y sus consultas siguen protegidas
  por RLS.
- Cambiar etapa de oportunidad se hace con RPC que agrega un evento inmutable.

## Localización

Fase 3 solo se habilita en desarrollo con Supabase en `localhost` o
`127.0.0.1`. Build DEV conectado a Supabase remoto y build productivo la
mantienen apagada. El contador de visitas y su migración están limitados a
Supabase/Worker DEV y no modifican producción.

## Verificación

Las pruebas de la página conservan la gestión actual de propiedades. Las
pruebas de `AgentGrowthPanel` cubren consentimiento explícito, estados vacíos,
error/reintento y envío del prospecto.

## Diseño responsive

La cabecera de `AgentPropertyManager` mantiene título y controles apilados hasta
el breakpoint `xl`. Así, el buscador y los tres filtros caben entre 1024 y 1279
píxeles; en pantallas más anchas se muestran en una fila.

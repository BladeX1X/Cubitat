# Seguridad e integración de Fase 2

## Frontera de entorno

### Escenario: build de producción

- Dado un build de producción de Cubitat
- Cuando un usuario navega por moderación, cuenta o detalle de propiedad
- Entonces no se muestran KYC, perfil de agente, reputación ni panel de agente
- Y las rutas `/agente/:id` y `/panel-agente` no activan módulos de Fase 2

### Escenario: Worker productivo

- Dado el Worker del entorno productivo
- Cuando recibe o evalúa un evento programado
- Entonces no procesa alertas de Fase 2
- Y el Cron de Fase 2 existe únicamente en el entorno DEV

### Escenario: backend aislado

- Dado el inventario de migraciones productivas
- Cuando se ejecuta el procedimiento normal de `supabase db push`
- Entonces no incluye la migración de Fase 2
- Y la prueba de Fase 2 requiere un proyecto Supabase DEV explícito

## KYC

### Escenario: usuario intenta auto-verificarse

- Dado un usuario autenticado con permiso de actualizar su perfil
- Cuando intenta cambiar `verification_status` o `verification_reason`
- Entonces la base rechaza la operación salvo que el actor sea admin AAL2

### Escenario: documento privado

- Dado un usuario autenticado que envía un documento válido
- Cuando se almacena el archivo
- Entonces la solicitud guarda solo una ruta dentro de su carpeta
- Y el bucket no es público
- Y el moderador AAL2 recibe un enlace firmado temporal

### Escenario: administrador sin segundo factor

- Dado un administrador con sesión AAL1
- Cuando consulta o resuelve una solicitud KYC
- Entonces RLS o la RPC rechazan la operación

## Perfiles y confianza

### Escenario: perfil público seguro

- Dado un anunciante con una propiedad publicada
- Cuando se abre `/agente/:id`
- Entonces una RPC pública devuelve solo campos permitidos y métricas agregadas
- Y no flexibiliza la RLS privada de `profiles`

### Escenario: perfil no disponible

- Dado que no existe evidencia pública del perfil
- Cuando se renderiza una ficha
- Entonces no se asume verificación ni se muestra una puntuación inventada

## Alertas

### Escenario: entrega programada

- Dada una notificación de alerta marcada como pendiente
- Cuando se ejecuta el evento programado del Worker
- Entonces el correo se envía con el secreto server-side
- Y la entrega queda marcada como enviada o reintentable sin registrar datos personales

# Verificación documental de propiedad

Este módulo de Fase 2 permite solicitar y revisar evidencia documental privada
de una propiedad sin convertir la revisión en una certificación legal.

## Alcance

- Las evidencias viven en un bucket privado y la base de datos solo conserva la
  ruta interna, nunca una URL pública.
- El propietario solo puede solicitar la verificación de una propiedad propia.
- Un administrador puede revisar y cambiar el estado según su rol. Mientras MFA administrativo esté desactivado, no se exige sesión AAL2.
- El indicador de confianza es interno y explicable; no promete titularidad ni
  sustituye una validación legal.

### Requirement: Crear una solicitud privada

El sistema MUST permitir una única solicitud pendiente por propiedad propia y
MUST comprobar que el objeto exista en el bucket privado antes de registrarla.

#### Scenario: Propietario envía evidencia

- GIVEN un usuario autenticado es propietario de una propiedad
- WHEN envía un tipo de documento permitido y una ruta dentro de su carpeta
- THEN el sistema MUST crear una solicitud `pending`
- AND MUST rechazar rutas fuera de la carpeta del propietario, objetos ausentes
  y una segunda solicitud pendiente.

### Requirement: Revisar como administrador

El sistema MUST permitir aprobar o rechazar una solicitud únicamente a un
administrador y MUST exigir un motivo no vacío para rechazarla. Mientras MFA
administrativo esté desactivado, MUST NOT exigir una sesión AAL2.

#### Scenario: Revisión administrativa

- GIVEN existe una solicitud `pending`
- WHEN un administrador autenticado la aprueba o rechaza
- THEN el sistema MUST guardar el estado, actor, fecha y motivo de rechazo
- AND un usuario sin rol administrador MUST recibir un error de permiso.

### Requirement: Indicador interno explicable

El sistema MUST calcular un indicador de 0 a 100 únicamente para usuarios
autenticados con factores visibles: identidad del propietario verificada,
documento de propiedad aprobado, publicación activa y datos de contacto.
El indicador MUST quedar etiquetado como interno y no implicar una garantía
legal.

#### Scenario: Moderator inspects a listing without a document request

- GIVEN un moderador administrador abre una ficha en el panel de propiedades
- AND la ficha no tiene una solicitud documental pendiente
- WHEN solicita ver el indicador interno
- THEN el sistema MUST consultar únicamente el Trust Score de esa ficha
- AND mostrar el puntaje y sus cuatro factores con lenguaje comprensible
- AND aclarar que el indicador no es una certificación legal
- AND MUST NOT modificar la publicación ni exponer el puntaje al público.

### Requirement: Perfil productivo aislado

El perfil productivo de verificación documental MUST habilitar el panel del
propietario y la sección administrativa sin activar KYC, agentes, alertas ni
pHash. MUST apuntar al proyecto Supabase productivo. El Worker productivo
MUST permitir solo las RPC documentales requeridas para sesiones autenticadas;
las reglas RLS y la comprobación de rol administrador de la base de datos
siguen siendo la autoridad de acceso; MFA administrativo permanece desactivado.

#### Scenario: Build de documentos

- GIVEN el build usa el modo `phase2-documents`
- WHEN se configura una URL Supabase distinta del proyecto productivo o falta
  la anon key
- THEN el build MUST fallar antes de generar un artefacto deployable.
- WHEN la configuración es válida
- THEN el bundle MUST incluir el flujo documental y excluir los otros módulos
  de Fase 2 no incluidos en ese perfil.

### Requirement: Perfil productivo completo de Fase 2

El build `phase2-production` MUST habilitar KYC, verificación documental,
Trust Score interno, vendedor verificado y señales de duplicado pHash en un
solo bundle productivo. MUST exigir la URL y anon key del Supabase productivo,
excluir cualquier referencia al proyecto/Worker DEV, conservar la PWA del
dominio productivo y no habilitar el dispatcher de correo de alertas. El Worker
productivo MUST permitir las RPC pHash solo a sesiones autenticadas; la base de
datos conserva RLS y acceso `service_role` para escrituras; el control admin de
base de datos no exige AAL2 mientras MFA administrativo esté desactivado.

#### Scenario: Build combinado de producción

- GIVEN se construye `npm run build:phase2-production`
- WHEN falta la URL/anon key productiva o la URL apunta a DEV
- THEN el build MUST fallar
- WHEN la configuración productiva es válida
- THEN el artefacto MUST incluir los módulos de Fase 2 y superar los guards de
  bundle de cliente, Worker y secretos antes de poder desplegarse

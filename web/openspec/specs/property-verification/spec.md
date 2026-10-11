# Verificación documental de propiedad

Este módulo de Fase 2 permite solicitar y revisar evidencia documental privada
de una propiedad sin convertir la revisión en una certificación legal.

## Alcance

- Las evidencias viven en un bucket privado y la base de datos solo conserva la
  ruta interna, nunca una URL pública.
- El propietario solo puede solicitar la verificación de una propiedad propia.
- Un administrador con sesión AAL2 puede revisar y cambiar el estado.
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

### Requirement: Revisar con AAL2

El sistema MUST permitir aprobar o rechazar una solicitud únicamente a un
administrador con AAL2 y MUST exigir un motivo no vacío para rechazarla.

#### Scenario: Revisión administrativa

- GIVEN existe una solicitud `pending`
- WHEN un administrador AAL2 la aprueba o rechaza
- THEN el sistema MUST guardar el estado, actor, fecha y motivo de rechazo
- AND una sesión sin AAL2 MUST recibir un error de permiso.

### Requirement: Indicador interno explicable

El sistema MUST calcular un indicador de 0 a 100 únicamente para usuarios
autenticados con factores visibles: identidad del propietario verificada,
documento de propiedad aprobado, publicación activa y datos de contacto.
El indicador MUST quedar etiquetado como interno y no implicar una garantía
legal.

### Requirement: Perfil productivo aislado

El perfil productivo de verificación documental MUST habilitar el panel del
propietario y la sección administrativa sin activar KYC, agentes, alertas ni
pHash. MUST apuntar al proyecto Supabase productivo. El Worker productivo
MUST permitir solo las RPC documentales requeridas para sesiones autenticadas;
las reglas RLS y la comprobación AAL2 de la base de datos siguen siendo la
autoridad de acceso.

#### Scenario: Build de documentos

- GIVEN el build usa el modo `phase2-documents`
- WHEN se configura una URL Supabase distinta del proyecto productivo o falta
  la anon key
- THEN el build MUST fallar antes de generar un artefacto deployable.
- WHEN la configuración es válida
- THEN el bundle MUST incluir el flujo documental y excluir los otros módulos
  de Fase 2 no incluidos en ese perfil.

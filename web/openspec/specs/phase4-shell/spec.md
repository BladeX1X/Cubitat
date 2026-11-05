# Composición de módulos Fase 4

## Propósito

Registrar y componer módulos habilitados de Fase 4 sin ser propietario de datos
ni reglas comerciales.

## Requisitos

### Registro modular

- Cada módulo declara una clave estable, prerrequisitos, rutas, enlaces,
  paneles administrativos y adaptadores de moderación.
- Un módulo con prerrequisitos ausentes permanece desactivado y no rompe el
  arranque de la app.

### Activación independiente

- **WHEN** se desactiva una clave de módulo
- **THEN** no se registran sus rutas, enlaces, paneles ni chunks de interfaz
- **AND** los módulos independientes restantes siguen funcionando
- La UI exclusiva de Fase 4 se mantiene fuera del build productivo hasta un
  rollout aprobado explícitamente.

### Sin lógica de dominio

- El shell no consulta tablas Supabase, no administra estados de negocio y no
  contiene políticas específicas de servicios, reseñas, materiales, beneficios
  o valoración.
- Moderación común se compone mediante adaptadores suministrados por cada
  módulo y autenticación AAL2 de plataforma.
